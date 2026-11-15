export const eveningProgram = 'Biểu diễn nghệ thuật truyền thống Nhật Bản vào tối thứ Sáu, thứ Bảy và Chủ nhật hằng tuần.';

// The date picker supplies a restaurant-local calendar date, independent of the visitor's timezone.
export function hasEveningProgram(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return false;
  const day = new Date(date + 'T12:00:00Z').getUTCDay();
  return [5, 6, 0].includes(day);
}
