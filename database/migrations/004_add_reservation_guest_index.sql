-- 004_add_reservation_guest_index.sql (idempotent – safe to run more than once)
-- Adds indexes to speed up guest lookup and reservation dashboard queries.
-- Run against System_Restaurant database. Safe to re-run.

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Reservations_guest_date'
    AND object_id = OBJECT_ID(N'dbo.Reservations')
)
  CREATE INDEX IX_Reservations_guest_date
    ON dbo.Reservations(user_id, reservation_date)
    INCLUDE (reservation_status, order_code, total_amount);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Reservations_date_status'
    AND object_id = OBJECT_ID(N'dbo.Reservations')
)
  CREATE INDEX IX_Reservations_date_status
    ON dbo.Reservations(reservation_date, reservation_status)
    INCLUDE (user_id, total_amount, created_at);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_OrderItems_order'
    AND object_id = OBJECT_ID(N'dbo.OrderItems')
)
  CREATE INDEX IX_OrderItems_order
    ON dbo.OrderItems(order_id)
    INCLUDE (dish_id, quantity, unit_price, item_status);
GO
