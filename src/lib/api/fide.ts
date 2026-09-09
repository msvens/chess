import { FideService } from '@msvens/schack-se-sdk';

/**
 * The one FIDE client. ChessTools is a different upstream from SSF, so the SDK's
 * global `configure` does not reach it — the base URL is a constructor argument,
 * and it must be our own origin for the same CORS reason as `init.ts`. Vite and
 * nginx both proxy `/api/chesstools` to `api.chesstools.org`.
 *
 * The Next app constructed this in every component that needed it, three times
 * with the same literal. One instance means one place to know the path.
 */
export const fideService = new FideService('/api/chesstools');
