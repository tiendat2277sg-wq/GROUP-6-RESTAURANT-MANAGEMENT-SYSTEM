// Bug 15: timeline must never clip bookings after 20:00 / closing time.
export function toMins(t) {
  if (!t) return NaN;
  const [h, m] = String(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
export function computeGanttRange(hours, reservations = []) {
  let open = toMins(hours?.open_time);
  let close = toMins(hours?.close_time);
  if (!Number.isFinite(open)) open = 10 * 60;
  if (!Number.isFinite(close)) close = 22 * 60;
  if (close <= open) close = Math.max(open + 720, 22 * 60);
  for (const r of reservations) {
    const s = toMins(r.start_time);
    let e = toMins(r.end_time);
    if (!Number.isFinite(s)) continue;
    if (!Number.isFinite(e) || e <= s) e = s + (r.durationMinutes || 90);
    if (s < open) open = Math.floor(s / 60) * 60;
    if (e > close) close = Math.ceil(e / 60) * 60;
  }
  return { openMins: open, closeMins: Math.min(close, 24 * 60) };
}
