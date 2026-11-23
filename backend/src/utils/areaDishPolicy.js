/**
 * Omakase seating policy — single source of truth for the backend.
 *
 *  - A table in the Omakase Area may order ONLY: Omakase sets, Beverages, Desserts.
 *    Regular dishes and every other set are blocked there. Omakase sets can be ordered at the table (booking one is optional).
 *  - A table in any other area may NOT order an Omakase set.
 *  - Takeout / no-table contexts behave like a regular table (Omakase is dine-in only).
 *
 * Areas and dishes are recognised by name so no schema change is needed:
 *  - area  : name contains "omakase"            (e.g. "Omakase Area")
 *  - dish  : name contains "omakase" OR its category name contains "omakase"
 *  - drink / dessert : category name looks like Beverages / Desserts
 */
import pool from "../db.js";

export const OMAKASE_AREA_NAME = "Omakase Area";

export const POLICY_MESSAGES = {
  OMAKASE_ONLY_AT_OMAKASE_AREA:
    "Omakase sets can only be ordered at tables in the Omakase Area.",
  OMAKASE_AREA_RESTRICTED:
    "At an Omakase counter, orders are limited to Omakase sets, drinks and desserts.",
  OMAKASE_NO_TRANSFER:
    "A reservation cannot be moved between the Omakase Area and other areas.",
  OMAKASE_NO_MIXED_AREAS:
    "Omakase Area tables cannot be combined with tables from other areas.",
};

export function isOmakaseAreaName(name) {
  return /omakase/i.test(String(name || ""));
}

export function isOmakaseDish(dish) {
  const name = dish?.dish_name ?? dish?.name ?? "";
  const category = dish?.category_name ?? dish?.category ?? "";
  return /omakase/i.test(String(name)) || /omakase/i.test(String(category));
}

export function isDrinkOrDessertDish(dish) {
  const category = dish?.category_name ?? dish?.category ?? "";
  if (/surcharge/i.test(String(dish?.dish_name ?? dish?.name ?? ""))) return true;
  return /bev|drink|wine|cocktail|sake|alcohol|dessert|tr[áa]ng\s*mi[eệ]ng|đồ\s*uống|rượu/i.test(String(category));
}

/** Pure rule check. Returns null when allowed, otherwise a POLICY_MESSAGES code. */
export function violationFor(dish, tableIsOmakase, allowOmakaseSet = true) {
  const omakase = isOmakaseDish(dish);
  if (tableIsOmakase) {
    if (isDrinkOrDessertDish(dish)) return null;
    return omakase && allowOmakaseSet ? null : "OMAKASE_AREA_RESTRICTED";
  }
  return omakase ? "OMAKASE_ONLY_AT_OMAKASE_AREA" : null;
}

function uniqueIds(values) {
  return [...new Set(
    (values || []).map((v) => Number(v)).filter((v) => Number.isSafeInteger(v) && v > 0)
  )];
}

async function rowsOf(executor, text) {
  // Ids are sanitised integers and inlined, so the same SQL runs on the pool wrapper or inside a mssql transaction.
  if (executor && typeof executor.request === "function") {
    const result = await executor.request().query(text);
    return result.recordset || [];
  }
  const [rows] = await pool.query(text);
  return rows;
}

export async function loadDishesById(dishIds, executor) {
  const ids = uniqueIds(dishIds);
  if (!ids.length) return [];
  return rowsOf(
    executor,
    `SELECT d.dish_id, d.dish_name, c.category_name
       FROM dbo.Dishes d
       LEFT JOIN dbo.MenuCategories c ON c.category_id = d.category_id
      WHERE d.dish_id IN (${ids.join(",")})`
  );
}

/** omakase = every table is in an Omakase area; mixed = some are, some are not. */
export async function resolveTablesOmakase(tableIds, executor) {
  const ids = uniqueIds(tableIds);
  if (!ids.length) return { omakase: false, mixed: false, known: false };
  // A merged child table is judged by its own area as well as its parent's.
  const rows = await rowsOf(
    executor,
    `SELECT t.table_id, a.area_name
       FROM dbo.RestaurantTables t
       LEFT JOIN dbo.RestaurantAreas a ON a.area_id = t.area_id
      WHERE t.table_id IN (${ids.join(",")})`
  );
  if (!rows.length) return { omakase: false, mixed: false, known: false };
  const flags = rows.map((r) => isOmakaseAreaName(r.area_name));
  const omakase = flags.every(Boolean);
  const mixed = !omakase && flags.some(Boolean);
  return { omakase, mixed, known: true };
}

export async function tableIdsOfReservation(reservationId, executor) {
  const id = Number(reservationId);
  if (!Number.isSafeInteger(id) || id <= 0) return [];
  const rows = await rowsOf(
    executor,
    `SELECT rt.table_id FROM dbo.ReservationTables rt WHERE rt.reservation_id = ${id}`
  );
  return rows.map((r) => r.table_id);
}

export async function tableIdsOfOrder(orderId, executor) {
  const id = Number(orderId);
  if (!Number.isSafeInteger(id) || id <= 0) return [];
  const rows = await rowsOf(
    executor,
    `SELECT o.table_id, o.reservation_id FROM dbo.Orders o WHERE o.order_id = ${id}`
  );
  const order = rows[0];
  if (!order) return [];
  if (order.table_id) return [order.table_id];
  return tableIdsOfReservation(order.reservation_id, executor);
}

/**
 * Mixed-area tables are rejected even with no items (table selection / merge).
 * `items` may be [{dish_id}], [{menu_item_id}], [{id}] or plain ids.
 * `tableIds` empty / unknown => treated as a regular table (no Omakase).
 * `executor` (optional) = an mssql Transaction, so the check sees the same snapshot.
 */
export async function assertItemsAllowedForTables(tableIds, items, executor, { allowOmakaseSet = true } = {}) {
  const tables = await resolveTablesOmakase(tableIds, executor);
  if (tables.mixed) throw new PolicyError("OMAKASE_NO_MIXED_AREAS");

  const dishIds = uniqueIds(
    (items || []).map((i) =>
      typeof i === "object" && i !== null ? (i.dish_id ?? i.menu_item_id ?? i.dishId ?? i.id) : i
    )
  );
  if (!dishIds.length) return;

  const dishes = await loadDishesById(dishIds, executor);
  for (const dish of dishes) {
    const code = violationFor(dish, tables.omakase, allowOmakaseSet);
    if (code) throw new PolicyError(code, dish.dish_name);
  }
}

/** Moving a party between Omakase and non-Omakase tables is not allowed (menus differ). */
export async function assertSameSeatingKind(fromTableIds, toTableIds, executor) {
  const [from, to] = await Promise.all([
    resolveTablesOmakase(fromTableIds, executor),
    resolveTablesOmakase(toTableIds, executor),
  ]);
  if (to.mixed) throw new PolicyError("OMAKASE_NO_MIXED_AREAS");
  if (from.known && to.known && from.omakase !== to.omakase) throw new PolicyError("OMAKASE_NO_TRANSFER");
}

export const assertItemsAllowedForReservation = async (reservationId, items, executor) =>
  assertItemsAllowedForTables(await tableIdsOfReservation(reservationId, executor), items, executor);

export const assertItemsAllowedForOrder = async (orderId, items, executor, options = {}) =>
  assertItemsAllowedForTables(await tableIdsOfOrder(orderId, executor), items, executor, options);

/** Run a policy check inside a controller: returns true when it already answered with an error. */
export async function guard(res, fn) {
  try {
    await fn();
    return false;
  } catch (error) {
    if (error?.name === "PolicyError") {
      sendPolicyError(res, error);
      return true;
    }
    throw error;
  }
}

export class PolicyError extends Error {
  constructor(code, dishName = null) {
    super(POLICY_MESSAGES[code] || "This item is not available for the selected table.");
    this.name = "PolicyError";
    this.code = code;
    this.status = 400;
    this.dishName = dishName;
  }
}

export function sendPolicyError(res, error) {
  return res.status(error.status || 400).json({
    success: false,
    code: error.code,
    message: error.message,
    dish: error.dishName || undefined,
  });
}
