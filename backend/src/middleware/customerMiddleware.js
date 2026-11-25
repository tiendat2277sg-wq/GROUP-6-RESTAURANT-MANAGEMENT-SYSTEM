import pool from "../db.js";

const CUSTOMER_ROLE = "Customer";

// Dev-only shortcut: skips customer checks. Must be switched on explicitly with
// ALLOW_DEV_CUSTOMER_FALLBACK=true AND never works when NODE_ENV=production.
// Default is secure (deny), so a forgotten NODE_ENV on the server cannot open access.
const devFallbackEnabled = () =>
  process.env.NODE_ENV !== "production" &&
  String(process.env.ALLOW_DEV_CUSTOMER_FALLBACK || "").toLowerCase() === "true";

/**
 * Ensures the caller is an active Customer (after resolveUserId + requireUserId).
 */
export async function requireCustomer(req, res, next) {
  const deny = () =>
    res.status(403).json({ success: false, message: "Customer access required." });
  try {
    let userId = req.userId || req.user?.user_id || req.user?.id;
    if (!userId && devFallbackEnabled()) {
      const [[devCust]] = await pool.query("SELECT TOP 1 user_id FROM dbo.UserAccounts WHERE email = 'quagphu159@gmail.com' OR role_id = (SELECT role_id FROM dbo.Roles WHERE role_name = 'Customer') ORDER BY CASE WHEN email = 'quagphu159@gmail.com' THEN 0 ELSE 1 END");
      userId = devCust?.user_id || 1;
      req.userId = userId;
    }

    if (!userId) return deny();

    const [rows] = await pool.query(
      `SELECT r.role_name
       FROM dbo.UserAccounts AS ua
       INNER JOIN dbo.Roles AS r ON ua.role_id = r.role_id
       WHERE ua.user_id = ?
         AND ua.is_active = 1;`,
      [userId]
    );

    const roleName = rows[0]?.role_name;
    if (!roleName) {
      if (devFallbackEnabled()) {
        req.userId = userId;
        req.customerRole = CUSTOMER_ROLE;
        return next();
      }
      return deny();
    }

    if (roleName !== CUSTOMER_ROLE && !devFallbackEnabled()) return deny();

    req.customerRole = roleName;
    return next();
  } catch (error) {
    console.error("requireCustomer failed:", error);
    if (devFallbackEnabled()) {
      req.customerRole = CUSTOMER_ROLE;
      return next();
    }
    return res.status(500).json({
      success: false,
      message: "Could not verify customer access.",
    });
  }
}
