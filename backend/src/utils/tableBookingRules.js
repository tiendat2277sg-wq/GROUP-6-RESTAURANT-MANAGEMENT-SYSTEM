// How many tables one booking may hold.
//  - Regular areas: at most one table per 2 guests (4 guests -> 2 tables, 6 -> 3, 8 -> 4).
//  - Omakase area: every guest takes one counter seat, and each seat is its own table.
// Event purposes keep their existing freedom to combine tables (outside the Omakase area).

export const MULTI_TABLE_PURPOSES = new Set([
  "birthday", "business meeting", "family gathering", "special occasion", "private party",
]);

export function maxTablesForParty(guestCount, atOmakase = false) {
  const guests = Math.max(1, Math.floor(Number(guestCount)) || 1);
  return atOmakase ? guests : Math.max(1, Math.ceil(guests / 2));
}

/** Returns an error message, or null when the number of tables is acceptable. */
export function checkTableCount({ tableCount, guestCount, areaNames = [], diningPurpose = "" }) {
  const atOmakase = areaNames.length > 0 && areaNames.every((name) => /omakase/i.test(String(name || "")));
  const isEvent = MULTI_TABLE_PURPOSES.has(String(diningPurpose || "").trim().toLowerCase());
  if (isEvent && !atOmakase) return null;
  const max = maxTablesForParty(guestCount, atOmakase);
  if (Number(tableCount) <= max) return null;
  return atOmakase
    ? `Omakase seats one guest each: ${guestCount} guest(s) can reserve at most ${max} seat(s).`
    : `${guestCount} guest(s) can reserve at most ${max} table(s).`;
}
