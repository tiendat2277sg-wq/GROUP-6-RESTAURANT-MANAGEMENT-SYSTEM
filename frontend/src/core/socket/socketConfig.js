const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
const envApiUrl = import.meta.env.VITE_API_BASE_URL;

// If VITE_SOCKET_URL is set, use it. Otherwise if VITE_API_BASE_URL is a full http URL, use it.
// In dev, connect to the page's own origin; Vite proxies /socket.io (ws: true)
// to the backend on 5001. Connecting straight to http://127.0.0.1:5001 from a
// page served on localhost:5173 is a different origin and failed in testing
// (endless "WebSocket connection ... failed" retries, no live updates).
const devSocketUrl =
  import.meta.env.DEV && typeof window !== "undefined" ? window.location.origin : "";
const rawUrl = envSocketUrl || (envApiUrl && envApiUrl.startsWith("http") ? envApiUrl : devSocketUrl);

export const SOCKET_URL = String(rawUrl).replace(/\/+$/, "");
