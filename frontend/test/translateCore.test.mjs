import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createTranslator, normalizeKey, buildDictionary, PATTERNS } from "../src/core/i18n/translateCore.js";

const messages = JSON.parse(fs.readFileSync(new URL(process.env.MESSAGES_JSON || "../../frontend/src/core/i18n/messages.json", import.meta.url)));

// Reference = the ORIGINAL inline implementation (verbatim logic).
function referenceTranslateWith(dictionaries, language, raw) {
  if (typeof raw !== "string" || !/\S/.test(raw)) return null;
  const hit = dictionaries[language].get(normalizeKey(raw));
  if (hit !== undefined && hit !== null) return hit;
  const text = raw.trim().replace(/\s+/g, " ");
  for (const [regex, fn] of PATTERNS[language] || []) if (regex.test(text)) return text.replace(regex, fn);
  return null;
}

test("identical results to the original implementation (all keys, values and pattern samples)", () => {
  const dictionaries = { vi: buildDictionary(messages, "vi", "en"), en: buildDictionary(messages, "en", "vi") };
  const t = createTranslator(messages);
  const samples = [];
  for (const loc of Object.keys(messages)) for (const [k, v] of Object.entries(messages[loc])) { samples.push(k); if (typeof v === "string") samples.push(v); }
  samples.push("3 unread", "12 chưa đọc", "Go to slide 4", "Capacity: 10 standing, 8 seated", "Entire Floor Capacity: 20 seated",
    "5:00 PM — 10:30 PM Daily", "Tháng 11/2026", "Quý 3/2026", "Năm 2026", "4 sao", "05:23", "1.290.000 VND", "  spaced   out  ", "", "   ", "12345", "11:30 – 14:30");
  let compared = 0;
  for (const language of ["vi", "en"]) for (const s of samples) {
    assert.equal(t.translateWith(language, s), referenceTranslateWith(dictionaries, language, s), `${language}: ${JSON.stringify(s)}`);
    assert.equal(t.translateWith(language, s), referenceTranslateWith(dictionaries, language, s)); // cached path
    compared++;
  }
  assert.ok(compared > 5000);
});

test("non-strings and blanks return null", () => {
  const t = createTranslator(messages);
  assert.equal(t.translateWith("vi", 5), null);
  assert.equal(t.translateWith("vi", "   "), null);
});

test("dictionaries are built lazily and the cache is bounded", () => {
  const t = createTranslator(messages);
  assert.equal(t.__cacheSize("en"), 0);
  for (let i = 0; i < 5000; i++) t.translateWith("vi", `tick ${i}`);
  assert.ok(t.__cacheSize("vi") <= 4000);
});

test("templates: {} fills in order, {n} reorders, captures use known words", () => {
  const t = createTranslator({
    vi: {
      "Table {} is now Available": "Bàn {} đã sẵn sàng",
      "Are you sure you want to {} this account?": "Bạn có chắc muốn {} tài khoản này?",
      "deactivate": "vô hiệu hóa",
      "Selected tables provide {} seats for {} guests. Please add another table ({} more seat{} needed).": "Có {1} chỗ cho {2} khách, cần thêm {3} chỗ.",
    },
    en: {},
  });
  assert.equal(t.translateWith("vi", "Table K-01 is now Available"), "Bàn K-01 đã sẵn sàng");
  assert.equal(t.translateWith("vi", "  Table   K-01 is now available "), "Bàn K-01 đã sẵn sàng");
  assert.equal(t.translateWith("vi", "Are you sure you want to deactivate this account?"), "Bạn có chắc muốn vô hiệu hóa tài khoản này?");
  assert.equal(t.translateWith("vi", "Selected tables provide 2 seats for 3 guests. Please add another table (1 more seat needed)."), "Có 2 chỗ cho 3 khách, cần thêm 1 chỗ.");
  assert.equal(t.translateWith("vi", "Table K-01 is now Broken"), null);
});

test("real messages.json: dynamic strings from the app translate", () => {
  const t = createTranslator(messages);
  assert.equal(t.translateWith("vi", "Your selected table is recorded as a preference. Staff confirms the final table within 3 hours of arrival."),
    "Bàn bạn chọn được ghi nhận là bàn mong muốn. Nhân viên sẽ xác nhận bàn chính thức trong vòng 3 giờ trước giờ đến.");
  assert.equal(t.translateWith("vi", "Table OMK-01 is now Available"), "Bàn OMK-01 đã sẵn sàng");
  assert.equal(t.translateWith("vi", "Reservation #42 checked in by staff"), "Đặt bàn #42 đã được nhân viên check-in");
});
