-- 003_add_menu_index.sql (idempotent – safe to run more than once)
-- Adds indexes to improve menu query performance.
-- Run against System_Restaurant database. Safe to re-run.

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Dishes_category_available'
    AND object_id = OBJECT_ID(N'dbo.Dishes')
)
  CREATE INDEX IX_Dishes_category_available
    ON dbo.Dishes(category_id, is_available)
    INCLUDE (dish_name, price, is_recommended);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Dishes_preorderable'
    AND object_id = OBJECT_ID(N'dbo.Dishes')
)
  CREATE INDEX IX_Dishes_preorderable
    ON dbo.Dishes(is_preorderable, is_available)
    INCLUDE (dish_name, category_id, price);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_MenuCategories_active_order'
    AND object_id = OBJECT_ID(N'dbo.MenuCategories')
)
  CREATE INDEX IX_MenuCategories_active_order
    ON dbo.MenuCategories(is_active, display_order)
    INCLUDE (category_name);
GO
