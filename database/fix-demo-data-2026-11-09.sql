-- Demo-data cleanup for System_Restaurant (run once in SSMS / sqlcmd).
USE System_Restaurant;
GO
SET XACT_ABORT ON;
BEGIN TRAN;

-- 1) Private room PR-01 seats 2 but is booked for 6 guests.
UPDATE dbo.RestaurantTables SET capacity = 6 WHERE table_number = N'PR-01' AND capacity < 6;

-- 2) Orphan kitchen items: still "Pending/Sent/Preparing" on bills older than 12h
--    (they show up as hundreds of minutes overdue on the KDS).
UPDATE oi SET item_status = N'Cancelled'
FROM dbo.OrderItems oi
JOIN dbo.Orders o ON o.order_id = oi.order_id
WHERE oi.item_status IN (N'Pending', N'Sent To Kitchen', N'Preparing')
  AND o.created_at < DATEADD(HOUR, -12, SYSDATETIME());

UPDATE kt SET kitchen_status = N'Cancelled'
FROM dbo.KitchenTickets kt
JOIN dbo.OrderItems oi ON oi.order_item_id = kt.order_item_id
WHERE oi.item_status = N'Cancelled' AND kt.kitchen_status IN (N'Pending', N'Preparing');

-- 3) Empty / stale unpaid bills on tables that are not occupied.
UPDATE o SET order_status = N'Cancelled'
FROM dbo.Orders o
JOIN dbo.RestaurantTables t ON t.table_id = o.table_id
WHERE o.order_status NOT IN (N'Paid', N'Cancelled')
  AND t.table_status <> N'Occupied'
  AND NOT EXISTS (SELECT 1 FROM dbo.OrderItems oi WHERE oi.order_id = o.order_id AND oi.item_status <> N'Cancelled');

-- 4) Walk-in reservations written by the old code in UTC (7h behind local time).
--    Only touches walk-ins created today before the fix; adjust the date if needed.
-- UPDATE dbo.Reservations
--    SET reservation_start_at = DATEADD(HOUR, 7, reservation_start_at),
--        reservation_end_at   = DATEADD(HOUR, 7, reservation_end_at)
--  WHERE reservation_source = N'Walk-in' AND reservation_id IN (100132);

COMMIT;
GO
