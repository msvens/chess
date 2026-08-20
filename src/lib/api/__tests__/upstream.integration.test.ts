// @vitest-environment node
/**
 * Live contract tests against the SSF and ChessTools APIs.
 *
 * Scope is deliberately narrow: only the upstream behaviours that exist as
 * assumptions in OUR proxy configuration (`vite.config.ts` in dev, nginx in prod).
 * If an upstream changes one of these, the config is silently wrong — usually in
 * the "everything 404s" direction — and a scheduled run tells us before a user does.
 *
 * Endpoint coverage and DTO shapes are NOT tested here. @msvens/schack-se-sdk owns
 * that and does it thoroughly (fide.integration.test.ts plus eight SSF suites);
 * duplicating it would just mean maintaining the same assertions twice and
 * inheriting ChessTools' flakiness in two repos.
 *
 * What remains is what the SDK has no reason to check: that a trailing slash still
 * changes the outcome (it only matters because we rewrite paths), and that the CORS
 * preflight still fails (a browser concern; the SDK is node-only).
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
});

describe.skipIf(await fideUnreachable())('ChessTools upstream contract', () => {
	// ChessTools is trailing-slash sensitive too, in the opposite direction from
	// most SSF endpoints: this one REQUIRES the slash. Same lesson for the proxy.
	it('requires the trailing slash on /fide/top_active/', async () => {
		const withoutSlash = await fetch(`${CHESSTOOLS_BASE}/fide/top_active?limit=1`);
		expect(withoutSlash.status).toBe(404);
	});
});
