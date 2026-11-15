/**
 * Build menu deep-link path for QR payload (supports /menu alias → /menus).
 */
export function buildMenuSessionPath(tableId, token) {
  const params = new URLSearchParams({
    table_id: String(tableId),
    session_token: String(token),
  });
  return `/menu?${params.toString()}`;
}

export function buildMenuSessionUrl(tableId, token) {
  const path = buildMenuSessionPath(tableId, token);
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export function buildQrImageUrl(payloadUrl, size = 240) {
  return `/api/local/qr?size=${size}x${size}&data=${encodeURIComponent(payloadUrl)}`;
}
