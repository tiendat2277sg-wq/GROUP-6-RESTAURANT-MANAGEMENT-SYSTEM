-- Sửa món id 3 bị lỗi tên lặp + giá 100 (chạy 1 lần trong SSMS)
UPDATE dbo.Dishes
SET dish_name = N'FLUKE SASHIMI DRY MISO',
    description = N'yuzu juice, extra virgin olive oil, dry miso, chives',
    price = 188000
WHERE dish_id = 3;
