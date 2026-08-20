/**
 * Boots the Vite dev server for the proxy suite, and tears it down after.
 *
 * Used as a vitest `globalSetup`. The proxy under test lives in `vite.config.ts`
 * under `server.proxy`, so it only exists when the dev server is actually running
 * — there is no way to assert it from a unit test, and it is the piece of this
 * repo most able to break silently.
 */
import { createServer, type ViteDevServer } from 'vite';

/** Where the suite addresses the app. Must match `server.port` in vite.config.ts. */
export const DEV_ORIGIN = 'http://localhost:3001';

let server: ViteDevServer | undefined;

export async function setup(): Promise<void> {
	// `strictPort` is on in vite.config.ts, so this throws rather than silently
	// picking another port if 3001 is taken — which is what we want: a suite that
	// quietly tested nothing would be worse than one that fails to start.
	server = await createServer({ mode: 'test' });
	await server.listen();
}

export async function teardown(): Promise<void> {
	await server?.close();
}
