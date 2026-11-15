/**
 * Pure translation engine behind LanguageProvider (no React, no DOM) so it can be
 * unit-tested and tuned in isolation. Behaviour is identical to the original inline
 * implementation; the differences are performance only:
 *   - dictionaries are built lazily, per language, on first use (the English one is
 *     never built for a Vietnamese-only visitor);
 *   - results are memoised in a bounded cache (the DOM translator re-asks for the
 *     same strings on every re-render / mutation);
 *   - the regex patterns are skipped for strings with no letters (clocks, prices,
 *     counters) – they can never match and those strings change every tick.
 */
export const normalizeKey = (value) => value.trim().replace(/\s+/g, " ").toLowerCase();

const HAS_LETTER = /\p{L}/u;
const pad2 = (n) => String(n).padStart(2, "0");
const to24 = (h, m, ap) => `${pad2((Number(h) % 12) + (/pm/i.test(ap) ? 12 : 0))}:${m}`;

export const PATTERNS = {
  vi: [
    [/^(\d+) unread$/i, (_, n) => `${n} chưa đọc`],
    [/^Go to slide (\d+)$/i, (_, n) => `Chuyển đến slide ${n}`],
    [/^(Entire Floor )?Capacity: (.+)$/i, (_, floor, rest) =>
      `${floor ? "Toàn bộ tầng — sức chứa" : "Sức chứa"}: ${rest.replace(/(\d+) standing/gi, "$1 đứng").replace(/(\d+) seated/gi, "$1 ngồi")}`],
    [/^(\d{1,2}):(\d{2}) (AM|PM)\s*[—–-]\s*(\d{1,2}):(\d{2}) (AM|PM)( Daily)?$/i,
      (_, h1, m1, a1, h2, m2, a2, daily) => `${to24(h1, m1, a1)} – ${to24(h2, m2, a2)}${daily ? " hằng ngày" : ""}`],
  ],
  en: [
    [/^Tháng (\d{1,2})\/(\d{4})$/i, (_, m, y) => `Month ${m}/${y}`],
    [/^(\d+) chưa đọc$/i, (_, n) => `${n} unread`],
    [/^Chuyển đến slide (\d+)$/i, (_, n) => `Go to slide ${n}`],
    [/^Quý (\d)\/(\d{4})$/i, (_, q, y) => `Q${q}/${y}`],
    [/^Năm (\d{4})$/i, (_, y) => `Year ${y}`],
    [/^(\d+) sao$/i, (_, n) => `${n} stars`],
  ],
};

/** Two-way dictionary: declared translations + the reverse of the other language (never overriding declared ones). */
export function buildDictionary(messages, locale, other) {
  const map = new Map(Object.entries(messages[locale] || {}).map(([source, translation]) => [normalizeKey(source), translation]));
  const reverse = new Map();
  Object.entries(messages[other] || {}).forEach(([source, translation]) => {
    if (typeof translation !== "string") return;
    const key = normalizeKey(translation);
    if (!key || map.has(key) || key === normalizeKey(source)) return;
    const rank = (s) => [s === s.toUpperCase() ? 1 : 0, s.length];
    const prev = reverse.get(key);
    const [a1, a2] = rank(source);
    if (!prev || a1 < rank(prev)[0] || (a1 === rank(prev)[0] && a2 < rank(prev)[1])) reverse.set(key, source);
  });
  reverse.forEach((source, key) => map.set(key, source));
  return map;
}

const OTHER = { vi: "en", en: "vi" };
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Dictionary keys that contain "{}" are templates for strings built at run time
 * ("Table {} is now Available"). Each "{}" matches any text; the captured parts are
 * translated when they are known words and substituted into the translation, where
 * "{}" fills in order and "{1}", "{2}"... pick a specific capture (so word order may change).
 */
function compileTemplates(entries) {
  const list = [];
  for (const [source, value] of Object.entries(entries || {})) {
    if (typeof value !== "string" || !source.includes("{}")) continue;
    const pattern = source.trim().replace(/\s+/g, " ").split("{}").map(escapeRegExp).join("(.*?)");
    list.push({ regex: new RegExp(`^${pattern}$`, "i"), value, weight: source.replace(/\{\}/g, "").length });
  }
  return list.sort((a, b) => b.weight - a.weight); // most specific wording first
}
const CACHE_LIMIT = 4000;

export function createTranslator(messages) {
  const dictionaries = {};
  const templates = {};
  const caches = { vi: new Map(), en: new Map() };
  const dictionaryFor = (language) =>
    (dictionaries[language] ||= buildDictionary(messages, language, OTHER[language]));

  const templatesFor = (language) => (templates[language] ||= compileTemplates(messages[language]));

  function applyTemplates(language, text) {
    for (const { regex, value } of templatesFor(language)) {
      const match = regex.exec(text);
      if (!match) continue;
      const parts = match.slice(1).map((part) => dictionaryFor(language).get(normalizeKey(part)) ?? part);
      let next = 0;
      return value.replace(/\{(\d*)\}/g, (_, index) => parts[index ? Number(index) - 1 : next++] ?? "");
    }
    return null;
  }

  function compute(language, raw) {
    const hit = dictionaryFor(language).get(normalizeKey(raw));
    if (hit !== undefined && hit !== null) return hit;
    const text = raw.trim().replace(/\s+/g, " ");
    if (!HAS_LETTER.test(text)) return null; // patterns all need letters
    for (const [regex, fn] of PATTERNS[language] || []) {
      if (regex.test(text)) return text.replace(regex, fn);
    }
    return applyTemplates(language, text);
  }

  /** Returns the translation, or null when there is none. */
  function translateWith(language, raw) {
    if (typeof raw !== "string" || !/\S/.test(raw)) return null;
    const cache = caches[language] || (caches[language] = new Map());
    if (cache.has(raw)) return cache.get(raw);
    const result = compute(language, raw);
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value); // drop oldest
    cache.set(raw, result);
    return result;
  }

  return { translateWith, dictionaryFor, __cacheSize: (l) => caches[l]?.size ?? 0 };
}
