-- Dat gio mo cua dat ban ve 10:00 (phuc vu 10:00-15:00 va 17:00-22:00)
-- Chay tren database dang dung (database local: USE System_Restaurant; database hosting: db_ad0f77_fuku)
UPDATE dbo.RestaurantSettings
SET setting_value = N'10:00'
WHERE setting_key = N'open_time';

SELECT setting_key, setting_value FROM dbo.RestaurantSettings WHERE setting_key IN (N'open_time', N'close_time');
