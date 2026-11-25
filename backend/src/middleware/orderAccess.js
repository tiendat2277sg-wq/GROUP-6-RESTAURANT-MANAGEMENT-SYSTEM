import db from '../db.js';

// A reservation can include preorders created before its QR session.
export const requireOrderAccess = (req, res, next) => checkOrderAccess(req, res, next, false);
export const requireReviewAccess = (req, res, next) => checkOrderAccess(req, res, next, true);

async function checkOrderAccess(req, res, next, review) {
  const id = Number(req.params.orderId ?? req.body?.orderId);
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
    return res.status(400).json({message:'Invalid order ID.'});
  }
  const token = req.get('X-Table-Token') || null;
  if (!req.user && !token) return res.status(401).json({message:'Sign in or scan the table QR code.'});
  const userId = req.user?.user_id ?? null;
  const staff = !review && [2,3,4].includes(req.user?.role_id);
  const [orders] = await db.query(`
    SELECT o.order_id, o.order_status, o.reservation_id, o.total_amount, COALESCE(o.customer_id,r.customer_id) AS customer_id
    FROM dbo.Orders o LEFT JOIN dbo.Reservations r ON r.reservation_id=o.reservation_id
    WHERE o.order_id=? AND (?=1 OR o.customer_id=? OR r.customer_id=? OR EXISTS (
      SELECT 1 FROM dbo.QROrderSessions q
      WHERE q.token=? AND (q.qr_session_id=o.qr_session_id OR
        (o.qr_session_id IS NULL AND q.reservation_id=o.reservation_id))
      AND ((q.session_status=N'Active' AND (q.expires_at IS NULL OR q.expires_at>SYSDATETIME()))
        OR (?=1 AND o.order_status=N'Paid' AND q.session_status=N'Closed'
          AND q.closed_at>=DATEADD(MINUTE,-15,SYSDATETIME())))
    ))`, [id,staff?1:0,userId,userId,token,(review || req.method==='GET')?1:0]);
  if (!orders.length) return res.status(404).json({message:'Order unavailable.'});
  req.paymentOrder = orders[0];
  next();
}
