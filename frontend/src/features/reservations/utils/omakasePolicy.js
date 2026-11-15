// Omakase seating policy (frontend mirror of backend/src/utils/areaDishPolicy.js).
//  - Omakase Area tables: Omakase sets, drinks and desserts only.
//  - Every other table: no Omakase sets.
// The server enforces the same rules; this module only keeps the UI honest.

export function isOmakaseAreaName(name) {
  return /omakase/i.test(String(name || ""));
}

export function isOmakaseDish(dish) {
  const name = dish?.dish_name ?? dish?.name ?? "";
  const category = dish?.category_name ?? dish?.category ?? "";
  return /omakase/i.test(String(name)) || /omakase/i.test(String(category));
}

export function isDrinkOrDessertDish(dish) {
  const name = dish?.dish_name ?? dish?.name ?? "";
  if (/surcharge/i.test(String(name))) return true;
  const category = dish?.category_name ?? dish?.category ?? "";
  return /bev|drink|wine|cocktail|sake|alcohol|dessert|tr[áa]ng\s*mi[eệ]ng|đồ\s*uống|rượu/i.test(String(category));
}

/** Can this dish be ordered at a table of the given kind? */
export function isDishAllowed(dish, atOmakaseTable, { allowOmakaseSet = true } = {}) {
  const omakase = isOmakaseDish(dish);
  if (atOmakaseTable) return isDrinkOrDessertDish(dish) || (omakase && allowOmakaseSet);
  return !omakase;
}

/** 'omakase' | 'regular' | 'mixed' for a list of tables ({ area_name }). Empty => 'regular'. */
export function seatingKind(tables) {
  const list = Array.isArray(tables) ? tables : [];
  if (!list.length) return "regular";
  const flags = list.map((t) => isOmakaseAreaName(t?.area_name));
  if (flags.every(Boolean)) return "omakase";
  return flags.some(Boolean) ? "mixed" : "regular";
}

/** Removes cart entries that the seating kind forbids. Cart = { [dish_id]: { name, category?, ... } }. */
export function pruneCartForSeating(cart, kind, { allowOmakaseSet = true } = {}) {
  const atOmakase = kind === "omakase";
  const next = {};
  let removed = 0;
  for (const [key, item] of Object.entries(cart || {})) {
    const known = item?.category !== undefined || isOmakaseDish(item);
    // Items without a known category can only be judged by name; keep them when unsure (server re-checks).
    const allowed = known
      ? isDishAllowed(item, atOmakase, { allowOmakaseSet })
      : !isOmakaseDish(item) || (atOmakase && allowOmakaseSet);
    if (allowed) next[key] = item;
    else removed += 1;
  }
  return { cart: next, removed };
}

/**
 * Most tables one booking may hold (mirror of backend/src/utils/tableBookingRules.js).
 * Regular areas: one table per 2 guests (4 -> 2, 6 -> 3, 8 -> 4).
 * Omakase area: one counter seat (= one table) per guest.
 */
export function maxTablesForParty(guestCount, atOmakase = false) {
  const guests = Math.max(1, Math.floor(Number(guestCount)) || 1);
  return atOmakase ? guests : Math.max(1, Math.ceil(guests / 2));
}
