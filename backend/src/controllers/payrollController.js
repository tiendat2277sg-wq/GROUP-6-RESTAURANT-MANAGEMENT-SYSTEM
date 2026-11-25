import db from "../db.js";
import { attendanceWindow, shiftClock } from "../utils/shiftWindow.js";

const HOUR_MS = 3_600_000;

export async function monthlyPayroll(req, res) {
  const month = req.query.month;
  if (typeof month !== "string" || !/^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({ message: "Expected month in YYYY-MM format." });
  }
  const userId = req.user.role_id === 2 ? req.user.user_id : null;
  const [rows] = await db.query(`
    ${shiftClock}
    DECLARE @month date = CONVERT(date,?,23);
    DECLARE @user int = ?;
    WITH periods AS (
      SELECT w.user_id, shift_start, w.started_at,
             (SELECT MIN(t) FROM (VALUES (w.ended_at), (@now), (DATEADD(HOUR,5,shift_start))) ends(t)) AS until_at
      FROM dbo.StaffWorkPeriods w
      ${attendanceWindow}
      WHERE w.started_at >= DATEADD(MINUTE,-@offset,CONVERT(datetime2,@month))
        AND w.started_at < DATEADD(MINUTE,-@offset,CONVERT(datetime2,DATEADD(MONTH,1,@month)))
        AND shift_hour IS NOT NULL AND (@user IS NULL OR w.user_id=@user)
    ), intervals AS (
      SELECT *, MAX(until_at) OVER(PARTITION BY user_id,shift_start ORDER BY started_at,until_at
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS previous_end
      FROM periods WHERE until_at>started_at
    ), shifts AS (
      SELECT user_id,shift_start,SUM(CASE WHEN previous_end>=until_at THEN 0 ELSE
             DATEDIFF_BIG(MILLISECOND,CASE WHEN previous_end>started_at THEN previous_end ELSE started_at END,until_at) END) AS worked_ms
      FROM intervals GROUP BY user_id,shift_start
    )
    SELECT u.user_id,u.full_name,COUNT(s.shift_start) AS shift_count,
           COUNT(CASE WHEN s.worked_ms >= 4 * 3600000 THEN 1 END) AS allowance_shifts,
           COALESCE(SUM(s.worked_ms),0) AS worked_ms
    FROM dbo.UserAccounts u LEFT JOIN shifts s ON s.user_id=u.user_id
    WHERE (@user IS NULL OR u.user_id=@user)
      AND ((u.role_id=2 AND u.is_active=1) OR s.shift_start IS NOT NULL)
    GROUP BY u.user_id,u.full_name ORDER BY u.full_name,u.user_id
  `, [month+"-01", userId]);
  const data = rows.map(({ worked_ms, ...row }) => {
    const ms = Number(worked_ms);
    const hourlyPay = Math.round(ms * 30000 / HOUR_MS);
    const allowance = row.allowance_shifts * 30000;
    const bonus = row.shift_count > 27 && ms > 130 * HOUR_MS ? 500000 : 0;
    return { ...row, worked_seconds: ms / 1000, hourly_pay: hourlyPay, allowance, bonus, total: hourlyPay + allowance + bonus };
  });
  res.set("Cache-Control","private, no-store").json({ month, data });
}
