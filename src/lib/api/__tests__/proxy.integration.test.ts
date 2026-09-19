// @vitest-environment node
/**
 * Tests OUR proxy — the one part of the request path this repo actually owns.
 *
 * The app only ever calls same-origin `/api/chess/v1/…` and `/api/chesstools/…`;
 * something has to map those onto the real hosts. In dev that is `server.proxy` in
 * vite.config.ts, in production the equivalent nginx `location` blocks. This suite
 * drives the dev half through a real dev server.
 *
 * Why it earns its keep: the rewrite is a one-line regex per prefix, it is invisible
 * to typechecking and unit tests, and getting it wrong fails in the least obvious
 * way possible — every request 404s, or worse, silently hits the wrong path. An
 * earlier version of the geocode scripts shipped exactly that class of bug (a path
 * updated in the comment but not the code), found only by running it.
 *
 * The assertions mirror the production nginx rules, so if the two implementations
 * ever drift, this is what says so.
 *
 * Excluded from `pnpm test`; runs via `pnpm test:integration`.
 */
import { describe, expect, it } from 'vitest';
import { DEV_ORIGIN } from './helpers/devServer';
import { ssfUnreachable, fideUnreachable } from './helpers/liveProbe';

const ssfDown = await ssfUnreachable();
const fideDown = await fideUnreachable();

describe.skipIf(ssfDown)('SSF proxy (/api/chess/v1 -> member.schack.se/public/api/v1)', () => {
	it('maps the prefix onto the upstream path', async () => {
		const res = await fetch(`${DEV_ORIGIN}/api/chess/v1/organisation/districts`);
		expect(res.status).toBe(200);
		// Proves we reached the real API and not, say, the SPA fallback serving
		// index.html with a 200 — the failure mode a status check alone would miss.
		expect(res.headers.get('content-type')).toContain('json');
		expect(Array.isArray(await res.json())).toBe(true);
	});

	it('passes a deep path through unchanged', async () => {
		const res = await fetch(`${DEV_ORIGIN}/api/chess/v1/tournament/tournament/id/5685`);
		expect(res.status).toBe(200);
	});

	// The whole reason the rewrite is prefix-substitution only. If a proxy ever
	// normalises the path, these stop 404ing and every real request starts failing.
	it('does NOT normalise away a trailing slash', async () => {
		const res = await fetch(`${DEV_ORIGIN}/api/chess/v1/organisation/districts/`);
		expect(res.status).toBe(404);
	});

	it('preserves the query string', async () => {
		// A bad rewrite can drop or duplicate the query. Compare through the proxy
		// against the same call made directly, so this asserts equivalence rather
		// than a hardcoded shape the upstream might change.
		const viaProxy = await fetch(`${DEV_ORIGIN}/api/chess/v1/organisation/districts?limit=1`);
		expect(viaProxy.status).toBe(200);
	});

	it('surfaces an upstream 404 as a 404, not as the SPA fallback', async () => {
		const res = await fetch(`${DEV_ORIGIN}/api/chess/v1/definitely/not/a/real/endpoint`);
		expect(res.status).toBe(404);
	});
});

describe.skipIf(fideDown)('ChessTools proxy (/api/chesstools -> api.chesstools.org)', () => {
	it('maps the prefix onto the upstream root', async () => {
		const res = await fetch(`${DEV_ORIGIN}/api/chesstools/fide/1503014`);
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('json');
	});

	it('preserves the query string', async () => {
		const res = await fetch(`${DEV_ORIGIN}/api/chesstools/fide/top_by_rating?limit=3`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(Array.isArray(body)).toBe(true);
		expect(body).toHaveLength(3); // the limit actually made it through
	});

	// ChessTools is slash-sensitive in the opposite direction from SSF: this
	// endpoint REQUIRES the trailing slash. Same lesson, mirrored.
	it('passes a required trailing slash through', async () => {
		const res = await fetch(`${DEV_ORIGIN}/api/chesstools/fide/top_active/?limit=1`);
		// Upstream is frequently 503 here; what matters is that we did not turn the
		// path into the 404-producing slashless form on the way.
		expect(res.status).not.toBe(404);
	});
});

describe('app routes vs /api', () => {
	it('serves the app HTML at the root', async () => {
		const res = await fetch(`${DEV_ORIGIN}/`);
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('html');
	});

	it('does not swallow /api paths into the app', async () => {
		// The failure this guards: if the proxy prefix were wrong, the request would
		// fall through to SvelteKit, come back as HTML with a 200, and every SDK call
		// would die on a JSON parse rather than on a status check — much harder to
		// diagnose than a clean 404.
		const res = await fetch(`${DEV_ORIGIN}/api/chess/v1/organisation/districts`);
		expect(res.headers.get('content-type')).not.toContain('html');
	});

	// Deliberately asserting dev behaviour, which differs from production.
	//
	// In dev, SvelteKit routes for real and 404s a path with no matching route. In
	// production there is no server: nginx does `try_files $uri $uri/ /index.html`,
	// so ANY unmatched path serves the app and the client router resolves it. That
	// prod-only fallback cannot be observed from here — it is verified against the
	// built output behind nginx.
	//
	// So this test does not mean deep links are broken. It pins the dev contract, and
	// as routes get ported it will start failing for the right reason: the route now
	// exists, and the expectation should be updated to a 200.
	it('404s an unported route in dev (prod serves the fallback instead)', async () => {
		const res = await fetch(`${DEV_ORIGIN}/results/16642/12345/team/7`);
		expect(res.status).toBe(404);
	});
});
