function parseQuantity(value) {
  if (value == null || value === '') return null;
  if (!['number','string'].includes(typeof value) || !/^\d+$/.test(String(value))) return NaN;
  const quantity = Number(value);
  return quantity >= 1 && quantity <= 2147483647 ? quantity : NaN;
}

import { getRawPool } from "../db.js";
import sql from '../sql-driver.js';

// Promotions use restaurant wall time in SQL datetime2 columns.
function restaurantDateTime(value) {
  if (typeof value !== "string") return null;
  const parts = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/.exec(value);
  if (!parts) return null;
  const [, day, hour="00", minute="00", second="00", zone] = parts;
  const local = day + "T" + hour + ":" + minute + ":" + second;
  const parsed = new Date(local+"Z");
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,19) !== local) return null;
  if (!zone) return local;
  const instant = Date.parse(local+zone);
  return Number.isFinite(instant) ? new Date(instant+7*3600000).toISOString().slice(0,19) : null;
}

export const getAllPromotions = async (req, res) => {
  try {
    const pool = await getRawPool();
    const result = await pool.request().query(`
      SELECT 
        p.promotion_id, 
        p.promotion_name,
        p.description,
        v.promo_code AS promo_code, 
        v.promo_code_id AS promo_code_id,
        UPPER(p.discount_type) AS discount_type, 
        p.discount_value, 
        p.max_discount AS max_discount_amount, 
        p.min_order_value, 
        CONVERT(varchar(19),p.start_at,126) AS valid_from, 
        CONVERT(varchar(19),p.end_at,126) AS valid_until, 
        v.usage_limit, 
        v.times_used AS used_count, 
        v.is_active, 
        p.applicable_to,
        p.points_required, p.total_quantity, p.remaining_quantity, p.validity_duration_hours,
        p.created_at, 
        p.updated_at
      FROM dbo.Promotions p
      LEFT JOIN dbo.PromoCodes v ON p.promotion_id = v.promotion_id
      ORDER BY p.created_at DESC
    `);

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error("Error fetching promotions:", error);
    res.status(500).json({ success: false, message: "Failed to fetch promotions", error: error.message });
  }
};

export const createPromotion = async (req, res) => {
  let transaction;
  try {
    const {
      promotion_name, description, promo_code, discount_type, discount_value, max_discount_amount,
      min_order_value, valid_from, valid_until, usage_limit, applicable_to,
      points_required, total_quantity, validity_duration_hours
    } = req.body;

    // Auth info for audit logging
    const managerId = req.user.user_id;

    if (!promo_code || !discount_type || discount_value === undefined || !valid_from || !valid_until || !promotion_name) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    if (isNaN(discount_value) || discount_value <= 0) {
      return res.status(400).json({ success: false, message: "Discount value must be a positive number" });
    }

    const normalizedDiscountType = discount_type.toUpperCase() === 'PERCENT' ? 'Percent' : 'Fixed';

    if (normalizedDiscountType === 'Percent' && discount_value > 100) {
      return res.status(400).json({ success: false, message: "Percentage discount cannot exceed 100%" });
    }

    const start = restaurantDateTime(valid_from);
    const end = restaurantDateTime(valid_until);
    if (!start || !end || end <= start) {
      return res.status(400).json({ success: false, message: "End date must be after start date" });
    }

    const parsedUsageLimit = parseInt(usage_limit, 10);
    if (!isNaN(parsedUsageLimit) && parsedUsageLimit <= 0) {
      return res.status(400).json({ success: false, message: "Usage limit must be greater than 0" });
    }

    // Normalize applicable_to — DB constraint only allows 'Reservation', 'Order', 'Both'
    const VALID_APPLICABLE = ['Reservation', 'Order', 'Both'];
    const normalizedApplicableTo = VALID_APPLICABLE.includes(applicable_to) ? applicable_to : 'Both';

    const parsedPointsRequired = points_required != null ? parseInt(points_required, 10) : null;
    const parsedTotalQty = parseQuantity(total_quantity);
    if (Number.isNaN(parsedTotalQty)) return res.status(400).json({success:false, message:"Total quantity must be a positive integer."});
    const parsedValidityHours = validity_duration_hours ? parseInt(validity_duration_hours, 10) : 24;

    const pool = await getRawPool();

    // Check uniqueness of promo_code in PromoCodes
    let checkResult;
    try {
      checkResult = await pool.request()
        .input('promo_code', sql.NVarChar(40), promo_code)
        .query(`SELECT promo_code_id FROM dbo.PromoCodes WHERE promo_code = @promo_code`);
    } catch (err) {
      console.error("DEBUG ERR in Check:", err.message);
      throw err;
    }

    if (checkResult.recordset.length > 0) {
      return res.status(409).json({ success: false, message: "Promotion code already exists" });
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // 1. Insert into Promotions
    let promoResult;
    try {
      promoResult = await transaction.request()
        .input('promotion_name', sql.NVarChar(150), promotion_name)
        .input('description', sql.NVarChar(500), description || null)
        .input('discount_type', sql.NVarChar(20), normalizedDiscountType)
        .input('discount_value', sql.Decimal(12, 2), discount_value)
        .input('max_discount', sql.Decimal(12, 2), max_discount_amount || null)
        .input('min_order_value', sql.Decimal(12, 2), min_order_value || 0)
        .input('start_at', sql.VarChar(19), start)
        .input('end_at', sql.VarChar(19), end)
        .input('is_active', sql.Bit, 1)
        .input('applicable_to', sql.NVarChar(20), normalizedApplicableTo)
        .input('points_required', sql.Int, parsedPointsRequired)
        .input('total_quantity', sql.Int, parsedTotalQty)
        .input('remaining_quantity', sql.Int, parsedTotalQty)
        .input('validity_duration_hours', sql.Int, parsedValidityHours)
        .input('created_by_staff_id', sql.Int, managerId)
        .query(`
          INSERT INTO dbo.Promotions (
            promotion_name, description, discount_type, discount_value, max_discount, 
            min_order_value, start_at, end_at, is_active, applicable_to,
            points_required, total_quantity, remaining_quantity, validity_duration_hours,
            created_by_staff_id, created_at, updated_at
          )
          OUTPUT inserted.promotion_id
          VALUES (
            @promotion_name, @description, @discount_type, @discount_value, @max_discount,
            @min_order_value, @start_at, @end_at, @is_active, @applicable_to,
            @points_required, @total_quantity, @remaining_quantity, @validity_duration_hours,
            @created_by_staff_id, SYSDATETIME(), SYSDATETIME()
          )
        `);
    } catch (err) {
      console.error("DEBUG ERR in Insert Promotions:", err.message);
      throw err;
    }

    const promotionId = promoResult.recordset[0].promotion_id;

    // 2. Insert into PromoCodes
    let promoCodeResult;
    try {
      promoCodeResult = await transaction.request()
        .input('promotion_id', sql.Int, promotionId)
        .input('promo_code', sql.NVarChar(40), promo_code)
        .input('usage_limit', sql.Int, parsedUsageLimit || 999999)
        .input('times_used', sql.Int, 0)
        .input('is_active', sql.Bit, 1)
        .query(`
          INSERT INTO dbo.PromoCodes (
            promotion_id, promo_code, usage_limit, times_used, is_active, 
            created_at, updated_at
          )
          OUTPUT inserted.*
          VALUES (
            @promotion_id, @promo_code, @usage_limit, @times_used, @is_active,
            SYSDATETIME(), SYSDATETIME()
          )
        `);
    } catch (err) {
      console.error("DEBUG ERR in Insert PromoCodes:", err.message);
      throw err;
    }

    // 3. Insert Audit Log
    const auditPayload = {
      promotion_id: promotionId,
      promotion_name: promotion_name,
      description: description || null,
      discount_type: normalizedDiscountType,
      discount_value: discount_value,
      max_discount: max_discount_amount || null,
      min_order_value: min_order_value || 0,
      start_at: valid_from,
      end_at: valid_until,
      promo_code: promo_code,
      usage_limit: parsedUsageLimit || 999999,
      applicable_to: normalizedApplicableTo,
      points_required: parsedPointsRequired,
      total_quantity: parsedTotalQty,
      validity_duration_hours: parsedValidityHours,
    };

    try {
      await transaction.request()
        .input('user_id', sql.Int, managerId)
        .input('action_name', sql.VarChar(100), 'CREATE_PROMOTION_CODE')
        .input('target_table', sql.VarChar(100), 'Promotions/PromoCodes')
        .input('target_id', sql.Int, promotionId)
        .input('new_value_json', sql.NVarChar(sql.MAX), JSON.stringify(auditPayload))
        .input('ip_address', sql.VarChar(50), req.ip || 'unknown')
        .query(`
          INSERT INTO dbo.AuditLogs (
            user_id, action_name, target_table, target_id, 
            new_value_json, ip_address, created_at
          ) VALUES (
            @user_id, @action_name, @target_table, @target_id, 
            @new_value_json, @ip_address, SYSDATETIME()
          )
        `);
    } catch (err) {
      console.error("DEBUG ERR in Insert AuditLogs:", err.message);
      throw err;
    }

    await transaction.commit();

    const newPromoCode = promoCodeResult.recordset[0];

    res.status(201).json({
      success: true,
      message: "Promotion created successfully",
      data: {
        promotion_id: newPromoCode.promo_code_id,
        promo_code: newPromoCode.promo_code,
        discount_type,
        discount_value,
        max_discount_amount,
        min_order_value: min_order_value || 0,
        valid_from,
        valid_until,
        usage_limit: usage_limit || 999999,
        used_count: 0,
        is_active: 1,
        applicable_to: normalizedApplicableTo,
        points_required: parsedPointsRequired,
        total_quantity: parsedTotalQty,
        validity_duration_hours: parsedValidityHours,
      }
    });
  } catch (error) {
    console.error("Error creating promotion:", error);
    if (transaction) {
      try { await transaction.rollback(); } catch (err) { }
    }
    res.status(500).json({ success: false, message: "Failed to create promotion" });
  }
};

export const updatePromotion = async (req, res) => {
  let transaction;
  try {
    const { id } = req.params; // promo_code_id
    const {
      promo_code, discount_type, discount_value, max_discount_amount,
      min_order_value, valid_from, valid_until, usage_limit, applicable_to
    } = req.body;

    if (!promo_code || !discount_type || discount_value === undefined || !valid_from || !valid_until) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const start = restaurantDateTime(valid_from);
    const end = restaurantDateTime(valid_until);
    if (!start || !end || end <= start) {
      return res.status(400).json({ success: false, message: "End date must be after start date" });
    }

    if (discount_value <= 0) {
      return res.status(400).json({ success: false, message: "Discount value must be a positive number" });
    }

    const normalizedDiscountType = discount_type.toUpperCase() === 'PERCENT' ? 'Percent' : 'Fixed';
    if (normalizedDiscountType === 'Percent' && discount_value > 100) {
      return res.status(400).json({ success: false, message: "Percentage discount cannot exceed 100%" });
    }

    const newQuantity = parseQuantity(req.body.total_quantity);
    if (Number.isNaN(newQuantity)) return res.status(400).json({success:false, message:"Total quantity must be a positive integer."});
    const pool = await getRawPool();

    // Find the promo code and promotion
    const promoCodeRes = await pool.request()
      .input('promo_code_id', sql.Int, id)
      .query('SELECT promotion_id, promo_code FROM dbo.PromoCodes WHERE promo_code_id = @promo_code_id');

    if (promoCodeRes.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Promotion/PromoCode not found" });
    }
    const promotionId = promoCodeRes.recordset[0].promotion_id;
    const currentCode = promoCodeRes.recordset[0].promo_code;

    // Check code uniqueness if changed
    if (currentCode !== promo_code) {
      const checkResult = await pool.request()
        .input('promo_code', sql.NVarChar(40), promo_code)
        .query(`SELECT promo_code_id FROM dbo.PromoCodes WHERE promo_code = @promo_code`);
      if (checkResult.recordset.length > 0) {
        return res.status(409).json({ success: false, message: "Promotion code already exists" });
      }
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();

    if (req.body.total_quantity !== undefined) {
      const stock = await transaction.request()
        .input('id', sql.Int, promotionId)
        .query(`SELECT total_quantity, remaining_quantity,
          (SELECT COUNT(*) FROM dbo.CustomerPromotions WHERE promotion_id = @id) AS issued
          FROM dbo.Promotions WITH (UPDLOCK,HOLDLOCK) WHERE promotion_id = @id`);
      const row = stock.recordset[0];
      const issued = Math.max(row.issued, (row.total_quantity ?? 0) - (row.remaining_quantity ?? row.total_quantity ?? 0));
      if (newQuantity !== null && newQuantity < issued) {
        await transaction.rollback();
        return res.status(409).json({success:false, message:"Total quantity cannot be lower than the number already issued."});
      }
      await transaction.request()
        .input('id', sql.Int, promotionId)
        .input('total', sql.Int, newQuantity)
        .input('remaining', sql.Int, newQuantity === null ? null : newQuantity - issued)
        .query('UPDATE dbo.Promotions SET total_quantity=@total, remaining_quantity=@remaining WHERE promotion_id=@id');
    }

    const VALID_APPLICABLE_UPDATE = ['Reservation', 'Order', 'Both'];
    const safeApplicableTo = VALID_APPLICABLE_UPDATE.includes(req.body.applicable_to) ? req.body.applicable_to : 'Both';

    await transaction.request()
      .input('promotion_id', sql.Int, promotionId)
      .input('promotion_name', sql.NVarChar(150), req.body.promotion_name || `Promo: ${promo_code}`)
      .input('discount_type', sql.NVarChar(20), normalizedDiscountType)
      .input('discount_value', sql.Decimal(12, 2), discount_value)
      .input('max_discount', sql.Decimal(12, 2), max_discount_amount || null)
      .input('min_order_value', sql.Decimal(12, 2), min_order_value || 0)
      .input('start_at', sql.VarChar(19), start)
      .input('end_at', sql.VarChar(19), end)
      .input('applicable_to', sql.NVarChar(20), safeApplicableTo)
      .input('points_required', sql.Int, req.body.points_required != null ? parseInt(req.body.points_required, 10) : null)
      .input('validity_duration_hours', sql.Int, req.body.validity_duration_hours ? parseInt(req.body.validity_duration_hours, 10) : 24)
      .query(`
        UPDATE dbo.Promotions SET 
          promotion_name = @promotion_name,
          discount_type = @discount_type,
          discount_value = @discount_value,
          max_discount = @max_discount,
          min_order_value = @min_order_value,
          start_at = @start_at,
          end_at = @end_at,
          applicable_to = @applicable_to,
          points_required = @points_required,
          validity_duration_hours = @validity_duration_hours,
          updated_at = SYSDATETIME()
        WHERE promotion_id = @promotion_id
      `);

    await transaction.request()
      .input('promo_code_id', sql.Int, id)
      .input('promo_code', sql.NVarChar(40), promo_code)
      .input('usage_limit', sql.Int, usage_limit || 999999)
      .query(`
        UPDATE dbo.PromoCodes SET
          promo_code = @promo_code,
          usage_limit = @usage_limit,
          updated_at = SYSDATETIME()
        WHERE promo_code_id = @promo_code_id
      `);

    await transaction.commit();

    res.json({
      success: true,
      message: "Promotion updated successfully"
    });
  } catch (error) {
    console.error("Error updating promotion:", error);
    if (transaction) {
      try { await transaction.rollback(); } catch (err) { }
    }
    res.status(500).json({ success: false, message: "Failed to update promotion" });
  }
};

export const togglePromotionStatus = async (req, res) => {
  try {
    const { id } = req.params; // promo_code_id
    const pool = await getRawPool();

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        UPDATE dbo.PromoCodes 
        SET is_active = is_active ^ 1, updated_at = SYSDATETIME()
        OUTPUT inserted.is_active
        WHERE promo_code_id = @id
      `);

    if (!result.recordset?.length) {
      return res.status(404).json({ success: false, message: "Promotion/PromoCode not found" });
    }

    res.json({
      success: true,
      message: "Promotion status updated",
      is_active: result.recordset[0].is_active
    });
  } catch (error) {
    console.error("Error toggling promotion status:", error);
    res.status(500).json({ success: false, message: "Failed to update promotion status" });
  }
};

export const deletePromotion = async (req, res) => {
  try {
    const { id } = req.params; // promo_code_id
    const pool = await getRawPool();

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        DELETE FROM dbo.PromoCodes
        WHERE promo_code_id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: "Promotion/PromoCode not found" });
    }

    res.json({
      success: true,
      message: "Promotion deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting promotion:", error);
    if (error.number === 547) {
      return res.status(409).json({ success: false, message: "Cannot delete promotion because it has been used in reservations." });
    }
    res.status(500).json({ success: false, message: "Failed to delete promotion" });
  }
};

/**
 * CUSTOMER API: Validate Promo Code
 * Endpoint: GET /api/promotions/validate/:code?order_value=100000
 */
export const validatePromoCode = async (req, res) => {
  try {
    const { code } = req.params;
    const { order_value, context } = req.query;

    const result = await checkPromoValidity(code, order_value, context || 'All');

    if (!result.isValid) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.json({
      success: true,
      data: result.promo
    });
  } catch (error) {
    console.error("Error validating promotion:", error);
    res.status(500).json({ success: false, message: "Failed to validate promotion" });
  }
};

/**
 * Shared utility to validate a promo code
 * @param {string} code - The promo code
 * @param {number} orderValue - The current cart/order total
 * @returns {object} { isValid: boolean, message?: string, promo?: object }
 */
export const checkPromoValidity = async (code, orderValue, context = 'All') => {
  if (!code) return { isValid: false, message: "No code provided" };
  const val = parseFloat(orderValue) || 0;

  const pool = await getRawPool();
  const result = await pool.request()
    .input('promo_code', sql.NVarChar(40), code)
    .query(`
      SELECT 
        p.promotion_id, v.promo_code_id AS promo_code_id, v.promo_code, 
        p.discount_type, p.discount_value, p.max_discount AS max_discount_amount, 
        p.min_order_value, v.usage_limit, v.times_used AS used_count,
        p.applicable_to
      FROM dbo.PromoCodes v
      JOIN dbo.Promotions p ON v.promotion_id = p.promotion_id
      WHERE v.promo_code = @promo_code 
        AND v.is_active = 1 
        AND p.is_active = 1
        AND p.start_at <= SYSDATETIME() 
        AND p.end_at >= SYSDATETIME()
    `);

  if (result.recordset.length === 0) {
    return { isValid: false, message: "Invalid or expired promo code." };
  }

  const promo = result.recordset[0];

  // Scope Check — DB constraint: 'Reservation' | 'Order' | 'Both'
  if (promo.applicable_to !== 'Both' && context !== 'Both' && promo.applicable_to !== context) {
    return { isValid: false, message: `This promo code is only applicable to ${promo.applicable_to.toLowerCase()}s.` };
  }

  if (promo.usage_limit && promo.used_count >= promo.usage_limit) {
    return { isValid: false, message: "This promo code has reached its usage limit." };
  }

  if (val < parseFloat(promo.min_order_value)) {
    return { isValid: false, message: `Order minimum of ${promo.min_order_value.toLocaleString()} required.` };
  }

  return { isValid: true, promo };
};
