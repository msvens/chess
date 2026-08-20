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
 */
configure({ baseUrl: '/api/chess/v1' });
