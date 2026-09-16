import { configure } from '@msvens/schack-se-sdk';

/**
 * Point the SDK at our own origin. Everything under /api/chess/v1 is proxied to
 * the SSF API — by Vite in dev, by nginx in production — so the app never makes
 * a cross-origin request.
 *
 * That indirection is required, not stylistic: SSF answers a CORS preflight with
 * 403, and the SDK sets `Content-Type: application/json` on every request
 * (including bodyless GETs), which forces one. Calling SSF directly from the
 * browser cannot work today.
 *
 * The timeout is 30s rather than the SDK's 10s default. The federation rating list
 * is ~900 KB and has been measured at 8s from a cold upstream, so 10s aborts a
 * request that would have succeeded — and the retry then looks instant, because SSF
 * has warmed up. nginx allows 60s, so this stays the tighter of the two.
 */
configure({ baseUrl: '/api/chess/v1', timeoutMs: 30_000 });
