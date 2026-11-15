/* ============================================================================
   Khu bàn OMAKASE - chạy MỘT LẦN trên database (local và database trên hosting).
   An toàn khi chạy lại: chỉ thêm cái còn thiếu, không xóa và không sửa dữ liệu cũ.

   Quy tắc (backend + giao diện đã áp dụng, nhận diện khu theo TÊN chứa "omakase"):
   - Bàn thường: không gọi được set Omakase.
   - Bàn khu Omakase: chỉ gọi đồ uống và tráng miệng tại bàn; set Omakase đặt trước khi đặt bàn.
   - Khu Omakase: bếp mở ở giữa, 8 chỗ ngồi bao quanh, mỗi khách một chỗ (mỗi chỗ là một bàn, capacity 1).
   - Mỗi suất Omakase cố định 2 giờ 30 phút; quá giờ phụ thu 20% tổng hóa đơn (phí phạt quá giờ).
   - Bàn khu Omakase không ghép được với khu khác, không đổi qua lại giữa khu Omakase và khu khác.
   ============================================================================ */

IF NOT EXISTS (SELECT 1 FROM dbo.RestaurantAreas WHERE area_name = N'Omakase Area')
    INSERT INTO dbo.RestaurantAreas (area_name, area_type, description)
    VALUES (N'Omakase Area', N'Bar', N'Dedicated chef counter; reserve an Omakase set in advance');
GO

DECLARE @areaId SMALLINT = (SELECT TOP 1 area_id FROM dbo.RestaurantAreas WHERE area_name = N'Omakase Area');

DECLARE @tables TABLE (table_number NVARCHAR(20));
INSERT INTO @tables VALUES (N'OMK-01'), (N'OMK-02'), (N'OMK-03'), (N'OMK-04'), (N'OMK-05'), (N'OMK-06'), (N'OMK-07'), (N'OMK-08');

INSERT INTO dbo.RestaurantTables (area_id, table_number, capacity, table_status, price_tier, static_qr_code, is_counter)
SELECT @areaId, t.table_number, 1, N'Available', N'Premium', N'qr-' + LOWER(t.table_number), 1
FROM @tables t
WHERE NOT EXISTS (SELECT 1 FROM dbo.RestaurantTables x WHERE x.table_number = t.table_number);

-- Nếu bàn đã tồn tại nhưng nằm sai khu thì đưa về khu Omakase
UPDATE rt SET rt.area_id = @areaId, rt.is_counter = 1, rt.capacity = 1, rt.updated_at = SYSDATETIME()
FROM dbo.RestaurantTables rt
JOIN @tables t ON t.table_number = rt.table_number
WHERE rt.area_id <> @areaId OR rt.capacity <> 1;
GO

/* Kiểm tra: phải thấy 8 chỗ ngồi OMK-01..08, mỗi chỗ capacity = 1 thuộc 'Omakase Area' */
SELECT a.area_name, t.table_number, t.capacity, t.table_status, t.is_counter
FROM dbo.RestaurantTables t JOIN dbo.RestaurantAreas a ON a.area_id = t.area_id
WHERE a.area_name = N'Omakase Area' ORDER BY t.table_number;

/* Kiểm tra dữ liệu cũ (chỉ đọc): đặt chỗ có món Omakase nhưng KHÔNG ở khu Omakase.
   Nếu có dòng nào, báo lại để xử lý thủ công (đổi bàn hoặc bỏ món). */
SELECT DISTINCT r.reservation_id, r.reservation_status, d.dish_name, a.area_name
FROM dbo.PreorderItems pi
JOIN dbo.Dishes d ON d.dish_id = pi.dish_id
JOIN dbo.Reservations r ON r.reservation_id = pi.reservation_id
LEFT JOIN dbo.ReservationTables rt ON rt.reservation_id = r.reservation_id
LEFT JOIN dbo.RestaurantTables t ON t.table_id = rt.table_id
LEFT JOIN dbo.RestaurantAreas a ON a.area_id = t.area_id
WHERE d.dish_name LIKE N'%omakase%' AND (a.area_name IS NULL OR a.area_name NOT LIKE N'%omakase%')
  AND r.reservation_status IN (N'Pending Request', N'Awaiting Deposit', N'Await Check-in', N'Dining', N'Pending Payment');
GO
