// Pure KDS helpers (tested by scripts/test-staff-helpers.mjs). Bug #12: counts must match cards shown.
export function kdsGroupKey(ticket) {
  return ticket.order_id || `${ticket.table_number}-${ticket.sent_at}`;
}
export function groupKdsTickets(tickets = []) {
  const map = {};
  for (const t of tickets) (map[kdsGroupKey(t)] ||= []).push(t);
  return Object.values(map);
}
export function countKdsOrders(tickets = []) {
  return groupKdsTickets(tickets).length;
}

// Bug #1: a pending pre-order must have a visible limit time and be forced to "Sent To Kitchen" at it.
export const KDS_LEAD_MIN = 15;
export function kdsSendDeadline(reservationStartAt) {
  return new Date(new Date(reservationStartAt).getTime() - KDS_LEAD_MIN * 60000);
}
export function fmtKdsTime(d) {
  return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}
export function shouldAutoSend(reservationStartAt, now = new Date()) {
  if (!reservationStartAt) return false;
  const diffMins = (new Date(reservationStartAt) - now) / 60000;
  return diffMins <= KDS_LEAD_MIN && diffMins > -120;
}
// touch 1794424283
