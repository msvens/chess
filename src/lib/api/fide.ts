import { MfideService } from '@msvens/schack-se-sdk';

/**
 * The one FIDE client, backed by mfide (FIDE's official monthly rating lists).
 * mfide is a different upstream from SSF, so the SDK's global `configure` does
 * not reach it — the base URL is a constructor argument, and it is our own
 * origin: nginx proxies `/api/fide` to mfide and adds the API key, so the key
 * never reaches the browser. In dev, Vite forwards `/api/fide` to production's
 * nginx (see `vite.config.ts`).
 */
export const fideService = new MfideService('/api/fide');
