/**
 * Định dạng ngày gửi lên API: luôn là "YYYY-MM-DD" theo GIỜ ĐỊA PHƯƠNG.
 * Không dùng toISOString() vì nó đổi sang UTC (lệch ngày ở múi giờ +7)
 * và có phần giờ làm server từ chối bộ lọc ngày.
 */
export function toApiDate(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Tạo query string ngày hợp lệ; bỏ qua nếu thiếu một đầu hoặc start > end. */
export function dateRangeQuery(startDate, endDate) {
  const from = toApiDate(startDate);
  const to = toApiDate(endDate);
  if (!from || !to || from > to) return {};
  return { startDate: from, endDate: to };
}
