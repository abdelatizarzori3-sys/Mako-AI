export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const FALLBACK_API_BASE = "https://marokecho-jrrh7cuh.manus.space";

// Begin OAuth on the HTTPS API origin. This makes the short-lived CSRF cookie
// available to the callback even when Mako runs inside a Capacitor WebView.
export const startLogin = () => {
  const isCapacitor = Boolean((window as Window & { Capacitor?: unknown }).Capacitor);
  const configuredBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
  const apiBase = configuredBase || (isCapacitor ? FALLBACK_API_BASE : window.location.origin);
  const startUrl = new URL("/api/oauth/start", apiBase);
  startUrl.searchParams.set("returnTo", window.location.href);
  window.location.assign(startUrl.toString());
};
