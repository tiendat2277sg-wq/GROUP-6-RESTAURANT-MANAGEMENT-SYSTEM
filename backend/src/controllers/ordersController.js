import { paymentQrUrl } from '../../../shared/bankTransfer.js';
import db, { getRawPool } from '../db.js';
import {getServiceChargePercent, computeBillTotals} from '../services/billTotals.js';
import sql from '../sql-driver.js';
import { getIO } from '../socket.js';
import { closeQrSessionsForCheckout } from '../services/qrSessionCleanupService.js';
import { releaseTableGroupForPayment } from '../services/tableReleaseService.js';
import { assertItemsAllowedForTables, PolicyError, sendPolicyError } from '../utils/areaDishPolicy.js';

function resolveCartDishId(item = {}) {
    const direct = Number(item.dish_id ?? item.menu_item_id ?? item.db_id);
    if (Number.isFinite(direct) && direct > 0) return direct;
    
    const idNum = Number(item.id);
    if (Number.isFinite(idNum) && idNum > 0) return idNum;
    
    return null;
}


async function findCartDish(transaction, item) {
    const id = resolveCartDishId(item);
    const name = String(item.name || item.dish_name || item.title || item.id || '').trim();
    const result = await transaction.request()
        .input('dishId', sql.Int, id)
        .input('name', sql.NVarChar(255), name)
        .query(`SELECT TOP 1 dish_id, price, dish_name, is_available FROM dbo.Dishes
            WHERE dish_id=@dishId OR LOWER(dish_name)=LOWER(@name)
            ORDER BY CASE WHEN dish_id=@dishId THEN 0 ELSE 1 END, dish_id`);
    return result.recordset[0];
}

async function checkoutQrDineInOrder(req, res) {
    const sessionId = Number(req.body.session_id ?? req.body.sessionId ?? req.body.qr_session_id);
    const requestedTableId = Number(req.body.table_id ?? req.body.tableId);
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    if (!items.length) {
        return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const token = req.get('X-Table-Token');
    if (!token || !Number.isSafeInteger(sessionId) || sessionId<=0) return res.status(403).json({message:'Valid table QR session required.'});
    const pool = await getRawPool();

    const transaction = new sql.Transaction(pool);
    await transaction.begin();


    try {
        const sessionResult = await transaction.request()
            .input('tableToken',sql.NVarChar(120),token)
            .input('sessionId', sql.Int, sessionId)
            .query(`
                SELECT TOP 1
                    qs.qr_session_id,
                    qs.table_id,
                    qs.customer_id,
                    qs.reservation_id,
                    qs.session_status,
                    t.table_number,
                    t.merged_into_table_id
                FROM dbo.QROrderSessions qs WITH (UPDLOCK)
                INNER JOIN dbo.RestaurantTables t ON t.table_id = qs.table_id
                WHERE qs.qr_session_id = @sessionId AND qs.token=@tableToken AND (qs.expires_at IS NULL OR qs.expires_at>SYSDATETIME())
                  AND qs.session_status = N'Active'
            `);

        const session = sessionResult.recordset[0];
        if (!session) {
            await transaction.rollback();
            return res.status(403).json({ success: false, message: 'QR session is not active.' });
        }
        
        let targetTableId = session.table_id;
        let targetTableNumber = session.table_number;
        
        if (session.merged_into_table_id) {
            targetTableId = session.merged_into_table_id;
        }

        const combinedRes = await transaction.request()
            .input('effectiveId', sql.Int, targetTableId)
            .query(`
                SELECT t2.table_number
                FROM dbo.RestaurantTables t1
                JOIN dbo.RestaurantTables t2 ON t2.merged_into_table_id = t1.table_id OR t2.table_id = t1.table_id
                WHERE t1.table_id = @effectiveId
                ORDER BY t2.table_number ASC
            `);
        if (combinedRes.recordset.length > 0) {
            targetTableNumber = combinedRes.recordset.map(r => r.table_number).join(' + ');
        }


        let isMatchingTable = 
            !Number.isFinite(requestedTableId) || 
            requestedTableId <= 0 ||
            Number(session.table_id) === requestedTableId || 
            Number(targetTableId) === requestedTableId;

        if (!isMatchingTable) {
            const checkReqTable = await transaction.request()
                .input('reqId', sql.Int, requestedTableId)
                .query(`SELECT table_id, merged_into_table_id FROM dbo.RestaurantTables WHERE table_id = @reqId`);
            if (checkReqTable.recordset.length > 0) {
                const reqMerged = checkReqTable.recordset[0].merged_into_table_id;
                if (Number(reqMerged) === Number(targetTableId) || Number(reqMerged) === Number(session.table_id)) {
                    isMatchingTable = true;
                }
            }
        }

        if (!isMatchingTable) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Table does not match QR session.' });
        }

        let subtotal = 0;
        const validItems = [];

        for (const item of items) {
            const quantity = Number(item.quantity);
            if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 2147483647) {
                await transaction.rollback();
                return res.status(400).json({message:'Invalid quantity.'});
            }
            const dish = await findCartDish(transaction,item);
            if (!dish?.is_available) {
                await transaction.rollback();
                return res.status(400).json({message:'Dish is unavailable. Please refresh the menu.'});
            }
            const dishId = dish.dish_id;
            const notes = String(item.notes || '').trim() || null;
            const unitPrice = Number(dish.price);
            subtotal += unitPrice * quantity;
            validItems.push({
                dish_id: dishId,
                dish_name: dish.dish_name,
                quantity,
                unit_price: unitPrice,
                notes,
            });
        }

        try {
            await assertItemsAllowedForTables([session.table_id, targetTableId], validItems, transaction, { allowOmakaseSet: true });
        } catch (policyError) {
            await transaction.rollback();
            if (policyError instanceof PolicyError) return sendPolicyError(res, policyError);
            throw policyError;
        }



        const previousOrder = (await transaction.request()
            .input('sessionId', sql.Int, sessionId)
            .query(`SELECT TOP 1 order_id,subtotal,discount_amount,order_status,amount_paid
                    FROM dbo.Orders WITH (UPDLOCK,HOLDLOCK)
                    WHERE qr_session_id=@sessionId AND order_type=N'QR Self'
                      AND parent_order_id IS NULL AND order_status NOT IN (N'Paid',N'Cancelled')
                    ORDER BY order_id DESC`)).recordset[0];
        if (previousOrder && (previousOrder.order_status === 'Billed' || Number(previousOrder.amount_paid) > 0)) {
            await transaction.rollback();
            return res.status(409).json({success:false,message:'This bill is already being paid.'});
        }
        subtotal += Number(previousOrder?.subtotal || 0);
        const billTotals = computeBillTotals(subtotal, await getServiceChargePercent(db), Number(previousOrder?.discount_amount || 0));
        const orderResult = await transaction.request()
            .input('existingOrderId', sql.Int, previousOrder?.order_id || null)
            .input('tableId', sql.Int, targetTableId)
            .input('customerId', sql.Int, session.customer_id || null)
            .input('reservationId', sql.Int, session.reservation_id || null)
            .input('sessionId', sql.Int, sessionId)
            .input('subtotal', sql.Decimal(12, 2), subtotal)
            .input('serviceCharge', sql.Decimal(12, 2), billTotals.service_charge)
            .input('totalAmount', sql.Decimal(12, 2), billTotals.total_amount)
            .query(`
                IF @existingOrderId IS NULL
                INSERT INTO dbo.Orders
                    (table_id, customer_id, qr_session_id, reservation_id, order_type, order_status, subtotal, service_charge, total_amount, created_at, updated_at)
                OUTPUT INSERTED.order_id
                VALUES
                    (@tableId, @customerId, @sessionId, @reservationId, N'QR Self', N'Sent To Kitchen', @subtotal, @serviceCharge, @totalAmount, SYSDATETIME(), SYSDATETIME())
                ELSE
                UPDATE dbo.Orders
                SET subtotal=@subtotal,service_charge=@serviceCharge,total_amount=@totalAmount,
                    order_status=N'Sent To Kitchen',updated_at=SYSDATETIME()
                OUTPUT INSERTED.order_id
                WHERE order_id=@existingOrderId
            `);

        const orderId = orderResult.recordset[0]?.order_id;
        const createdItems = [];

        for (const item of validItems) {
            const itemResult = await transaction.request()
                .input('orderId', sql.Int, orderId)
                .input('dishId', sql.Int, item.dish_id)
                .input('quantity', sql.Int, item.quantity)
                .input('unitPrice', sql.Decimal(12, 2), item.unit_price)
                .input('notes', sql.NVarChar(500), item.notes)
                .input('tableNumber', sql.NVarChar(255), String(targetTableNumber || targetTableId))
                .query(`
                    INSERT INTO dbo.OrderItems
                        (order_id, dish_id, quantity, unit_price, notes, snapshot_table_name, item_status)
                    OUTPUT INSERTED.order_item_id
                    VALUES
                        (@orderId, @dishId, @quantity, @unitPrice, @notes, @tableNumber, N'Pending')
                `);

            const orderItemId = itemResult.recordset[0]?.order_item_id;

            const ticketResult = await transaction.request()
                .input('orderItemId', sql.Int, orderItemId)
                .query(`
                    INSERT INTO dbo.KitchenTickets
                        (order_item_id, kitchen_status, priority_level, sent_at)
                    OUTPUT INSERTED.kitchen_ticket_id
                    VALUES
                        (@orderItemId, N'Pending', 3, SYSDATETIME())
                `);

            createdItems.push({
                ...item,
                order_item_id: orderItemId,
                kitchen_ticket_id: ticketResult.recordset[0]?.kitchen_ticket_id,
            });
        }

        await transaction.commit();

        const payload = {
            order_id: orderId,
            table_id: Number(session.table_id),
            table_number: session.table_number,
            session_id: sessionId,
            reservation_id: session.reservation_id ?? null,
            item_count: createdItems.reduce((sum, item) => sum + item.quantity, 0),
            items: createdItems,
        };

        const io = req.app?.get?.('io') || getIO();
        if (io) {
            io.to('room:kitchen').to('room:staff').to('room:manager').emit('NEW_KITCHEN_ORDER', payload);
            io.to('room:kitchen').emit('kitchen:new_preorder', payload);
            io.to('room:kitchen').emit('kitchen:new_ticket', payload);
            console.log("🌍 [SOCKET EMIT] NEW_KITCHEN_ORDER sent to Kitchen!", payload);
        }

        return res.status(201).json({
            success: true,
            message: 'Order sent to kitchen!',
            data: payload,
        });
    } catch (error) {
        try {
            await transaction.rollback();
        } catch (rollbackError) {
            console.error('[ordersController] QR checkout rollback failed:', rollbackError);
        }
        console.error('[ordersController] checkoutQrDineInOrder error:', error);
        return res.status(500).json({ success: false, message: 'Failed to send order to kitchen.', error: error.message });
    }
}

// PATCH /api/orders/items/:orderItemId/served
export const markItemServed = async (req, res) => {
    const { orderItemId } = req.params;
    const staffUserId = req.user?.user_id || req.body.actor_id || req.userId;

    try {
        const pool = await getRawPool();
        
        // 1. Verify item exists and enforce transition: only Ready → Served is allowed
        const currentItem = await pool.request()
            .input('orderItemId', sql.Int, orderItemId)
            .query(`
                SELECT oi.item_status, oi.order_id, oi.dish_id, kt.kitchen_ticket_id, kt.kitchen_status
                FROM dbo.OrderItems oi
                LEFT JOIN dbo.KitchenTickets kt ON kt.order_item_id = oi.order_item_id
                WHERE oi.order_item_id = @orderItemId
            `);

        if (currentItem.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Order item not found.' });
        }

        const { item_status, kitchen_status } = currentItem.recordset[0];

        if (item_status === 'Served') {
            return res.status(409).json({ success: false, message: 'Item is already served.' });
        }

        if (item_status === 'Cancelled') {
            return res.status(409).json({ success: false, message: 'Cannot serve a cancelled item.' });
        }

        // Enforce valid transition: must be Ready (from Kitchen) before marking Served
        // Allow override if kitchen_status is Ready or if no ticket (walk-in without KDS)
        const allowedFromStatuses = ['Ready', 'Pending', 'Preparing']; // staff can mark served once kitchen marks ready
        if (kitchen_status && kitchen_status !== 'Ready' && kitchen_status !== 'Cancelled') {
            // Only block if kitchen ticket exists and is not Ready
            if (!['Ready'].includes(kitchen_status)) {
                return res.status(409).json({
                    success: false,
                    message: `Cannot mark as served yet. Kitchen status is "${kitchen_status}". Wait for kitchen to mark it Ready.`
                });
            }
        }

        // 2. Update item status to Served
        await pool.request()
            .input('orderItemId', sql.Int, orderItemId)
            .query(`
                UPDATE dbo.OrderItems
                SET item_status = N'Served',
                    updated_at = SYSDATETIME()
                WHERE order_item_id = @orderItemId
            `);

        // 3. Log audit action
        await pool.request()
            .input('userId', sql.Int, staffUserId)
            .input('targetId', sql.Int, orderItemId)
            .input('oldValue', sql.NVarChar(sql.MAX), JSON.stringify({ item_status }))
            .input('newValue', sql.NVarChar(sql.MAX), JSON.stringify({ item_status: 'Served' }))
            .input('ipAddress', sql.NVarChar(45), req.ip || '127.0.0.1')
            .query(`
                INSERT INTO dbo.AuditLogs (user_id, action_name, target_table, target_id, old_value_json, new_value_json, ip_address, created_at)
                VALUES (@userId, N'MARK_ITEM_SERVED', N'OrderItems', @targetId, @oldValue, @newValue, @ipAddress, SYSDATETIME())
            `);

        // 4. Emit socket event
        const io = getIO();
        if (io) {
            io.to('room:staff').emit('orders:item_served', {
                orderItemId: parseInt(orderItemId, 10),
                previousStatus: item_status,
                servedAt: new Date().toISOString()
            });
        }

        res.json({ success: true, message: 'Item marked as served successfully.' });
    } catch (error) {
        console.error('[ordersController] markItemServed error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark item as served.', error: error.message });
    }
};

// POST /api/orders/checkout
export const checkoutOrder = async (req, res) => {
    const { table_id, items } = req.body;

    if (req.get('X-Table-Token') || req.body?.session_id || req.body?.sessionId || req.body?.qr_session_id) {
        return checkoutQrDineInOrder(req, res);
    }
    if (![2,3,4].includes(req.user?.role_id)) return res.status(403).json({message:"Valid table QR session required."});
    
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const parsedTableId = Number(table_id);
    if (!Number.isFinite(parsedTableId) || parsedTableId <= 0) {
        return res.status(400).json({ success: false, message: 'table_id is required for checkout.' });
    }

    // Validate quantity > 0 for all items upfront
    for (const item of items) {
        const qty = parseInt(item.quantity) || 0;
        if (qty <= 0) {
            return res.status(400).json({ success: false, message: 'All item quantities must be greater than 0.' });
        }
    }

    let pool;
    try {
        pool = await getRawPool();
    } catch (e) {
        return res.status(500).json({ success: false, message: 'DB connection failed' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        // Validate table exists and is Occupied or Reserved
        const tableCheck = await transaction.request()
            .input('tableId', sql.Int, parsedTableId)
            .query(`SELECT table_id, table_status, table_number, merged_into_table_id FROM dbo.RestaurantTables WHERE table_id = @tableId`);

        if (tableCheck.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Table not found.' });
        }
        let targetTableId = tableCheck.recordset[0].table_id;
        let tableStatus = tableCheck.recordset[0].table_status;
        let tableNumber = tableCheck.recordset[0].table_number;
        
        if (tableCheck.recordset[0].merged_into_table_id) {
            targetTableId = tableCheck.recordset[0].merged_into_table_id;
            const parentRes = await transaction.request()
                .input('parentId', sql.Int, targetTableId)
                .query(`SELECT table_status FROM dbo.RestaurantTables WHERE table_id = @parentId`);
            if (parentRes.recordset.length > 0) {
                tableStatus = parentRes.recordset[0].table_status;
            }
        }

        const combinedRes = await transaction.request()
            .input('effectiveId', sql.Int, targetTableId)
            .query(`
                SELECT t2.table_number
                FROM dbo.RestaurantTables t1
                JOIN dbo.RestaurantTables t2 ON t2.merged_into_table_id = t1.table_id OR t2.table_id = t1.table_id
                WHERE t1.table_id = @effectiveId
                ORDER BY t2.table_number ASC
            `);
        if (combinedRes.recordset.length > 0) {
            tableNumber = combinedRes.recordset.map(r => r.table_number).join(' + ');
        }


        if (!['Occupied', 'Reserved'].includes(tableStatus)) {
            await transaction.rollback();
            return res.status(409).json({
                success: false,
                message: `Table is currently "${tableStatus}". Can only create orders for Occupied or Reserved tables.`
            });
        }

        let totalAmount = 0;
        const validItems = [];

        for (const item of items) {
            const quantity = Number(item.quantity);
            if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 2147483647) {
                await transaction.rollback();
                return res.status(400).json({message:'Invalid quantity.'});
            }
            const dish = await findCartDish(transaction,item);
            if (!dish?.is_available) {
                await transaction.rollback();
                return res.status(400).json({message:'Dish is unavailable. Please refresh the menu.'});
            }
            const dishId = dish.dish_id;
            const notes = String(item.notes || '').trim() || null;
            const unitPrice = Number(dish.price);
            totalAmount += unitPrice * quantity;

            validItems.push({ dish_id: dishId, dish_name: dish.dish_name, quantity, unit_price: unitPrice, notes });
        }

        try {
            await assertItemsAllowedForTables([targetTableId], validItems, transaction, { allowOmakaseSet: true });
        } catch (policyError) {
            await transaction.rollback();
            if (policyError instanceof PolicyError) return sendPolicyError(res, policyError);
            throw policyError;
        }



        const billTotals = computeBillTotals(totalAmount, await getServiceChargePercent(db));
        totalAmount = billTotals.total_amount;
        // Insert Order
        const orderResult = await transaction.request()
            .input('tableId', sql.Int, targetTableId)
            .input('customerId', sql.Int, req.user?.user_id || null)
            .input('subtotal', sql.Decimal(18, 2), billTotals.subtotal)
            .input('serviceCharge', sql.Decimal(18, 2), billTotals.service_charge)
            .input('totalAmount', sql.Decimal(18, 2), totalAmount)
            .query(`
                INSERT INTO dbo.Orders (table_id, customer_id, subtotal, service_charge, total_amount, order_status, order_type, created_at, updated_at)
                OUTPUT INSERTED.order_id
                VALUES (@tableId, @customerId, @subtotal, @serviceCharge, @totalAmount, N'Sent To Kitchen', N'Dine-In', SYSDATETIME(), SYSDATETIME())
            `);

        const orderId = orderResult.recordset[0].order_id;
        const createdItems = [];

        // Insert OrderItems + KitchenTickets (with idempotency check)
        for (const vItem of validItems) {
            const itemResult = await transaction.request()
                .input('orderId', sql.Int, orderId)
                .input('dishId', sql.Int, vItem.dish_id)
                .input('quantity', sql.Int, vItem.quantity)
                .input('unitPrice', sql.Decimal(18, 2), vItem.unit_price)
                .input('notes', sql.NVarChar(500), vItem.notes)
                .input('tableNumber', sql.NVarChar(255), tableNumber)
                .query(`
                    INSERT INTO dbo.OrderItems (order_id, dish_id, quantity, unit_price, notes, snapshot_table_name, item_status)
                    OUTPUT INSERTED.order_item_id
                    VALUES (@orderId, @dishId, @quantity, @unitPrice, @notes, @tableNumber, N'Pending')
                `);

            const orderItemId = itemResult.recordset[0].order_item_id;

            // Idempotency: skip if ticket already exists for this order_item_id
            const existingTicket = await transaction.request()
                .input('orderItemId', sql.Int, orderItemId)
                .query(`SELECT kitchen_ticket_id FROM dbo.KitchenTickets WHERE order_item_id = @orderItemId`);

            let kitchenTicketId = null;
            if (existingTicket.recordset.length === 0) {
                const ticketResult = await transaction.request()
                    .input('orderItemId', sql.Int, orderItemId)
                    .query(`
                        INSERT INTO dbo.KitchenTickets (order_item_id, kitchen_status, priority_level, sent_at)
                        OUTPUT INSERTED.kitchen_ticket_id
                        VALUES (@orderItemId, N'Pending', 3, SYSDATETIME())
                    `);
                kitchenTicketId = ticketResult.recordset[0].kitchen_ticket_id;
            } else {
                kitchenTicketId = existingTicket.recordset[0].kitchen_ticket_id;
            }

            createdItems.push({ ...vItem, order_item_id: orderItemId, kitchen_ticket_id: kitchenTicketId });
        }

        await transaction.commit();

        const payload = {
            order_id: orderId,
            table_id: parsedTableId,
            table_number: tableNumber,
            item_count: createdItems.reduce((sum, i) => sum + i.quantity, 0),
            items: createdItems,
        };

        // Emit socket events for Kitchen and Staff dashboards
        const io = req.app?.get?.('io') || getIO();
        if (io) {
            io.to('room:kitchen').emit('kitchen:new_ticket', payload);
            io.to('room:kitchen').to('room:staff').to('room:manager').emit('NEW_KITCHEN_ORDER', payload);
            io.to('room:staff').emit('orders:new_order', payload);
        }

        // Generate SePay QR URL for payment
        const sepayUrl = paymentQrUrl(totalAmount, 'DH' + orderId);

        return res.status(201).json({
            success: true,
            message: 'Order sent to kitchen.',
            data: {
                order_id: orderId,
                total_amount: totalAmount,
                qr_url: sepayUrl,
                items: createdItems
            }
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('[ordersController] checkoutOrder error:', error);
        return res.status(500).json({ success: false, message: 'Server error during checkout' });
    }
};

// POST /api/orders/:orderId/apply-promo
export const applyPromoCode = async (req, res) => {
    const { orderId } = req.params;
    const { promo_code: promoCode } = req.body;
    const staffUserId = req.user?.user_id ?? null;

    if (!promoCode || !orderId) {
        return res.status(400).json({ success: false, message: 'Missing orderId or promo_code' });
    }

    let pool;
    try {
        pool = await getRawPool();
    } catch (e) {
        return res.status(500).json({ success: false, message: 'DB connection failed' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        // Step 1: Select & Lock Order, PromoCode, Promotion
        const orderRes = await transaction.request()
            .input('orderId', sql.Int, orderId)
            .query(`SELECT subtotal, service_charge, discount_amount, order_status FROM dbo.Orders WITH (UPDLOCK) WHERE order_id = @orderId`);
        
        if (orderRes.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const order = orderRes.recordset[0];
        
        if (order.order_status === 'Paid' || order.order_status === 'Cancelled') {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: `Cannot apply promo code to ${order.order_status} order.` });
        }

        if (order.discount_amount > 0) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Order already has a discount applied.' });
        }

        const promoRes = await transaction.request()
            .input('promoCode', sql.NVarChar(50), promoCode.trim().toUpperCase())
            .query(`
                SELECT 
                    v.promo_code_id, v.promo_code, v.times_used, v.usage_limit, v.is_active as promo_code_active,
                    p.promotion_id, p.is_active as promo_active, p.start_at, p.end_at, 
                    p.min_order_value, p.discount_type, p.discount_value, p.max_discount AS max_discount_amount
                FROM dbo.PromoCodes v WITH (UPDLOCK)
                JOIN dbo.Promotions p ON v.promotion_id = p.promotion_id
                WHERE v.promo_code = @promoCode
            `);
            
        if (promoRes.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Promo code not found' });
        }
        const promo = promoRes.recordset[0];

        // Validations
        if (!promo.promo_code_active || !promo.promo_active) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Promo code is no longer active' });
        }
        
        const now = new Date();
        if (promo.start_at && new Date(promo.start_at) > now) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Promo code is not yet valid' });
        }
        
        if (promo.end_at && new Date(promo.end_at) < now) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Promo code has expired' });
        }
        
        if (Number(order.subtotal) < Number(promo.min_order_value)) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: `Order subtotal must be at least ₫${promo.min_order_value}` });
        }
        
        if (promo.usage_limit !== null && promo.times_used >= promo.usage_limit) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Promo code usage limit exceeded' });
        }

        // Step 2: Math
        let discount = 0;
        const discountType = String(promo.discount_type).toUpperCase();
        if (discountType === 'FIXED') {
            discount = Number(promo.discount_value);
        } else if (discountType === 'PERCENT') {
            discount = Number(order.subtotal) * (Number(promo.discount_value) / 100);
            if (promo.max_discount_amount && discount > Number(promo.max_discount_amount)) {
                discount = Number(promo.max_discount_amount);
            }
        }
        
        const subtotal = Number(order.subtotal) || 0;
        const serviceCharge = Number(order.service_charge) || 0;
        const newTotalAmount = subtotal - discount + serviceCharge;

        // Step 3: Increment times_used on PromoCodes
        await transaction.request()
            .input('promoCodeId', sql.Int, promo.promo_code_id)
            .query(`UPDATE dbo.PromoCodes SET times_used = times_used + 1, updated_at = SYSDATETIME() WHERE promo_code_id = @promoCodeId`);

        // Step 4: Update Order
        await transaction.request()
            .input('orderId', sql.Int, orderId)
            .input('discount', sql.Decimal(12,2), discount)
            .input('newTotal', sql.Decimal(12,2), newTotalAmount)
            .query(`
                UPDATE dbo.Orders 
                SET discount_amount = @discount, total_amount = @newTotal, updated_at = SYSDATETIME()
                WHERE order_id = @orderId
            `);

        // Step 5: Audit Log
        await transaction.request()
            .input('userId', sql.Int, staffUserId)
            .input('targetId', sql.Int, orderId)
            .input('newValue', sql.NVarChar(sql.MAX), JSON.stringify({ promo_code: promo.promo_code, discount_amount: discount }))
            .input('ipAddress', sql.NVarChar(45), req.ip || '127.0.0.1')
            .query(`
                INSERT INTO dbo.AuditLogs (user_id, action_name, target_table, target_id, new_value_json, ip_address, created_at)
                VALUES (@userId, N'APPLY_PROMO_CODE', N'Orders', @targetId, @newValue, @ipAddress, SYSDATETIME())
            `);

        await transaction.commit();
        
        return res.status(200).json({
            success: true,
            message: 'Promo code applied successfully',
            data: { discount_amount: discount, total_amount: newTotalAmount }
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('[ordersController] applyPromoCode error:', error);
        return res.status(500).json({ success: false, message: 'Failed to apply promo code', error: error.message });
    }
};

// POST /api/payments/cash
// Handles cash payment: accepts amount_paid, computes change, marks order Paid.
export const processCashPayment = async (req, res) => {
    const { order_id, amount_paid } = req.body;
    const staffUserId = req.user?.user_id || null;

    const parsedOrderId = Number(order_id);
    const parsedAmountPaid = Number(amount_paid);

    if (!Number.isFinite(parsedOrderId) || parsedOrderId <= 0) {
        return res.status(400).json({ success: false, message: 'order_id is required.' });
    }
    if (!Number.isFinite(parsedAmountPaid) || parsedAmountPaid <= 0) {
        return res.status(400).json({ success: false, message: 'amount_paid must be greater than 0.' });
    }

    let pool;
    try {
        pool = await getRawPool();
    } catch (e) {
        return res.status(500).json({ success: false, message: 'DB connection failed' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        // 1. Fetch order and lock it
        const orderRes = await transaction.request()
            .input('orderId', sql.Int, parsedOrderId)
            .query(`
                SELECT order_id, order_status, total_amount, amount_paid AS already_paid,
                       table_id, qr_session_id, reservation_id, customer_id
                FROM dbo.Orders WITH (UPDLOCK)
                WHERE order_id = @orderId
            `);

        if (orderRes.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        const order = orderRes.recordset[0];

        if (order.order_status === 'Paid') {
            await transaction.rollback();
            return res.status(409).json({ success: false, message: 'Order is already paid.' });
        }
        if (order.order_status === 'Cancelled') {
            await transaction.rollback();
            return res.status(409).json({ success: false, message: 'Cannot pay for a cancelled order.' });
        }

        const totalDue = Number(order.total_amount) - Number(order.already_paid || 0);

        if (parsedAmountPaid < totalDue - 0.009) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: `Insufficient amount. Total due: ${totalDue.toLocaleString('vi-VN')}₫. Received: ${parsedAmountPaid.toLocaleString('vi-VN')}₫.`,
                data: { total_due: totalDue, amount_received: parsedAmountPaid }
            });
        }

        const changeGiven = Math.max(0, parsedAmountPaid - totalDue);

        // 2. Insert Payment record (method_id 1 = Cash)
        await transaction.request()
            .input('orderId', sql.Int, parsedOrderId)
            .input('reservationId', sql.Int, order.reservation_id || null)
            .input('amountPaid', sql.Decimal(12, 2), parsedAmountPaid)
            .input('changeGiven', sql.Decimal(12, 2), changeGiven)
            .input('staffId', sql.Int, staffUserId)
            .query(`
                INSERT INTO dbo.Payments (order_id, reservation_id, payment_method_id, amount_paid, change_given, processed_by_staff_id, payment_status, paid_at, created_at, updated_at)
                VALUES (@orderId, @reservationId, 1, @amountPaid, @changeGiven, @staffId, N'Completed', SYSDATETIME(), SYSDATETIME(), SYSDATETIME())
            `);

        // 3. Mark Order as Paid
        await transaction.request()
            .input('orderId', sql.Int, parsedOrderId)
            .input('amountPaid', sql.Decimal(12, 2), parsedAmountPaid)
            .query(`
                UPDATE dbo.Orders
                SET order_status = N'Paid', amount_paid = ISNULL(amount_paid, 0) + @amountPaid, updated_at = SYSDATETIME()
                WHERE order_id = @orderId
            `);

        // 4. A merged event is one bill: release every reservation table together.
        const releasedTableIds = order.table_id
            ? await releaseTableGroupForPayment({ transaction, tableId: order.table_id, reservationId: order.reservation_id })
            : [];

        // 5. Close every active QR session belonging to this table/reservation.
        const closedQrSessionIds = await closeQrSessionsForCheckout({
            transaction,
            tableId: order.table_id,
            reservationId: order.reservation_id,
        });

        // 6. Complete reservation if linked
        if (order.reservation_id) {
            await transaction.request()
                .input('resId', sql.Int, order.reservation_id)
                .query(`
                    UPDATE dbo.Reservations
                    SET reservation_status = N'Completed', updated_at = SYSDATETIME()
                    WHERE reservation_id = @resId;

                    INSERT INTO dbo.ReservationTimelines (reservation_id, event_type, performed_by, notes, created_at)
                    VALUES (@resId, N'PAYMENT_COMPLETED', NULL, N'Cash payment completed by staff', SYSDATETIME())
                `);
        }

        // 7. Audit log
        await transaction.request()
            .input('userId', sql.Int, staffUserId)
            .input('orderId', sql.Int, parsedOrderId)
            .input('newValue', sql.NVarChar(sql.MAX), JSON.stringify({ method: 'Cash', amount_paid: parsedAmountPaid, change_given: changeGiven }))
            .input('ip', sql.NVarChar(45), req.ip || '127.0.0.1')
            .query(`
                INSERT INTO dbo.AuditLogs (user_id, action_name, target_table, target_id, new_value_json, ip_address, created_at)
                VALUES (@userId, N'CASH_PAYMENT_COMPLETED', N'Orders', @orderId, @newValue, @ip, SYSDATETIME())
            `);

        await transaction.commit();

        // 8. Emit socket events
        const io = req.app?.get?.('io') || getIO();
        if (io) {
            const payload = { orderId: parsedOrderId, order_id: parsedOrderId, reservation_id: order.reservation_id ?? null, status: 'Paid', table_id: order.table_id, table_ids: releasedTableIds, payment_method: 'Cash' };
            io.emit('PAYMENT_STATUS_CHANGED', payload);
            for (const tableId of releasedTableIds) io.to('room:staff').to('room:manager').emit('table:status_changed', { tableId, status: 'Cleaning', reservation_id: order.reservation_id ?? null });
            io.to('room:kitchen').emit('kds:clear_order', { orderId: parsedOrderId });
            for (const sessionId of closedQrSessionIds) {
                io.to(`session_${sessionId}`).emit('TABLE_SESSION_CLEARED', {
                    session_id: sessionId,
                    table_id: order.table_id,
                    reason: 'payment_completed',
                });
            }
        }

        return res.json({
            success: true,
            message: 'Cash payment processed successfully.',
            data: {
                order_id: parsedOrderId,
                total_due: totalDue,
                amount_paid: parsedAmountPaid,
                change_given: changeGiven
            }
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('[ordersController] processCashPayment error:', error);
        return res.status(500).json({ success: false, message: 'Failed to process cash payment.', error: error.message });
    }
};
