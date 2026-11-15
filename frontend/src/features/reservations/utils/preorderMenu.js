import { menuCategories } from "@/features/menu/data/menuData.js";
import { resolveDishImage } from "@/features/menu/data/menuAssets.js";
import { setMenus } from "@/features/menu/data/omakaseMenus.js";

/**
 * Builds the pre-order dish list from the SAME sources the Menu page uses:
 *   - live rows from /api/menu (dish_id, price, availability, category) are the source of truth
 *     for what can be saved (the server needs a real dish_id);
 *   - menuData.js supplies the picture, description and ordering, matched by dish name exactly
 *     like MenuPage does, so a dish looks identical here and on the Menu page.
 * Omakase / Chef's sets get `setId` so the UI can open the course-by-course detail.
 */
const norm = (value) => String(value || "").trim().replace(/\s+/g, " ").toUpperCase();

const staticIndex = (() => {
  const map = new Map();
  menuCategories.forEach((category, categoryIndex) => {
    category.items.forEach((item, itemIndex) => {
      map.set(norm(item.name), { item, category, order: categoryIndex * 1000 + itemIndex });
    });
  });
  return map;
})();

// Menu-page dishes that have no row in the database yet. They are still listed (so the picker shows
// exactly the Menu page) but cannot be added until the dish exists in the DB (run migration 002).
function missingStaticRows(list) {
  const present = new Set(list.map((row) => norm(row.dish_name || row.name)));
  const extra = [];
  menuCategories.forEach((category) => {
    category.items.forEach((item) => {
      if (present.has(norm(item.name))) return;
      extra.push({
        dish_id: `static-${item.id}`,
        dish_name: item.name,
        price: item.price,
        description: item.description,
        category_name: category.name,
        is_available: false,
        notInDb: true,
      });
    });
  });
  return extra;
}

export function buildPreorderMenu(rows) {
  const dbList = Array.isArray(rows) ? rows : [];
  const list = dbList.length ? [...dbList, ...missingStaticRows(dbList)] : dbList;
  return list
    .map((row, index) => {
      const name = row.dish_name || row.name || "";
      const hit = staticIndex.get(norm(name));
      const setId = hit && setMenus[hit.item.id] ? hit.item.id : null;
      return {
        ...row,
        dish_id: row.dish_id,
        dish_name: name,
        price: Number(row.price) || 0,
        // Menu page category wins (the DB files Omakase sets under "Chef's Set Menu", the menu calls them "Omakase").
        category_name: hit?.category.name || row.category_name || row.category || "",
        description: row.description || hit?.item.description || "",
        is_available: row.notInDb ? false : row.is_available !== false && row.is_available !== 0,
        image: hit ? resolveDishImage(hit.item.image) : resolveDishImage(row, name),
        setId,
        setKind: setId ? hit.category.id : null,
        _order: hit ? hit.order : 100000 + index,
      };
    })
    .sort((a, b) => a._order - b._order);
}
