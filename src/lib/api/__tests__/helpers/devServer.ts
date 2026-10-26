/**
 * Boots the Vite dev server for the proxy suite, and tears it down after.
 *
 * Used as a vitest `globalSetup`. The proxy under test lives in `vite.config.ts`
 * under `server.proxy`, so it only exists when the dev server is actually running
 * — there is no way to assert it from a unit test, and it is the piece of this
 * repo most able to break silently.
 */
import { createServer, type ViteDevServer } from 'vite';

/**
 * The suite's own port, not dev's 3001, so it runs alongside `pnpm dev`. The
 * rest of the server, proxy included, is vite.config.ts as dev uses it.
 */
const TEST_PORT = 3901;

/** Where the suite addresses the app. */
export const DEV_ORIGIN = `http://localhost:${TEST_PORT}`;

let server: ViteDevServer | undefined;

export async function setup(): Promise<void> {
	// `strictPort` throws rather than silently picking another port if this one
	// is taken — which is what we want: a suite that quietly tested nothing would
	// be worse than one that fails to start.
	// Its own dependency cache too: sharing `node_modules/.vite` with a running
	// `pnpm dev` lets this server re-optimise deps underneath it, and dev then
	// serves a mix of old and new chunks (two Svelte runtimes, a blank page).
	server = await createServer({
		mode: 'test',
		cacheDir: 'node_modules/.vite-integration',
		server: { port: TEST_PORT, strictPort: true }
	});
	await server.listen();
}

export async function teardown(): Promise<void> {
	await server?.close();
}
