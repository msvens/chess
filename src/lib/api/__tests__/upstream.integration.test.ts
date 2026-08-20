// @vitest-environment node
/**
 * Live contract tests against the SSF and ChessTools APIs.
 *
 * These do NOT test our code. They assert the upstream behaviours that the proxy
 * configuration in `vite.config.ts` (dev) and nginx (prod) is built around. If SSF
 * changes any of them, our config is silently wrong — usually in the "everything
 * 404s" direction — and this suite is how we find out from a scheduled run rather
 * than from a user.
 *
 * Excluded from `pnpm test` and run by `pnpm test:integration` (see
 * .github/workflows/integration.yml), so a flaky upstream cannot block a merge.
 */
import { describe, expect, it } from 'vitest';
import { CHESSTOOLS_BASE, SSF_BASE, fideUnreachable, ssfUnreachable } from './helpers/liveProbe';

describe.skipIf(await ssfUnreachable())('SSF upstream contract', () => {
	// The rule the entire proxy design rests on. Both proxies use prefix
	// substitution precisely so these paths pass through untouched; if SSF ever
	// starts accepting (or redirecting) the trailing-slash form, the comments
	// warning against normalisation become stale and this test should be revisited.
	const trailingSlashSensitive = [
		'/organisation/districts',
		'/tournament/tournament/id/5685',
		'/tournamentresults/table/id/16642',
		'/player/408550/date/2026-01-01'
	];

	it.each(trailingSlashSensitive)('GET %s succeeds WITHOUT a trailing slash', async (path) => {
		const res = await fetch(`${SSF_BASE}${path}`);
		expect(res.status).toBe(200);
	});

	it.each(trailingSlashSensitive)('GET %s 404s WITH a trailing slash', async (path) => {
		const res = await fetch(`${SSF_BASE}${path}/`);
		expect(res.status).toBe(404);
	});

	// Why the proxy exists at all: SSF rejects the CORS preflight, and the SDK
	// forces one by sending Content-Type on every request. If this ever stops
	// being a 403, a direct-from-browser build becomes possible — worth knowing.
	it('still rejects the CORS preflight that makes a proxy mandatory', async () => {
		const res = await fetch(`${SSF_BASE}/organisation/districts`, {
			method: 'OPTIONS',
			headers: {
				Origin: 'https://chess.msvens.com',
				'Access-Control-Request-Method': 'GET',
				'Access-Control-Request-Headers': 'content-type'
			}
		});
		expect(res.status).toBe(403);
	});

	it('returns districts as a non-empty array', async () => {
		const res = await fetch(`${SSF_BASE}/organisation/districts`);
		const body = await res.json();
		expect(Array.isArray(body)).toBe(true);
		expect(body.length).toBeGreaterThan(0);
		expect(body[0]).toMatchObject({ id: expect.any(Number), name: expect.any(String) });
	});
});

describe.skipIf(await fideUnreachable())('ChessTools upstream contract', () => {
	it('serves a known player', async () => {
		const res = await fetch(`${CHESSTOOLS_BASE}/fide/1503014`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toMatchObject({ fideid: '1503014', name: expect.any(String) });
	});

	// ChessTools is trailing-slash sensitive too, in the opposite direction from
	// most SSF endpoints: this one REQUIRES the slash. Same lesson for the proxy.
	it('requires the trailing slash on /fide/top_active/', async () => {
		const withoutSlash = await fetch(`${CHESSTOOLS_BASE}/fide/top_active?limit=1`);
		expect(withoutSlash.status).toBe(404);
	});
});
