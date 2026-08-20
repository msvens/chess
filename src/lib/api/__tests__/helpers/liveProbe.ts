/**
 * Reachability probes for the live integration suites. Ported from the SDK
 * (`schack-se-sdk/__tests__/helpers/liveProbe.ts`), which uses the same pattern.
 *
 * A probe returns `true` only when the host couldn't be reached — signalled by the
 * SDK's transport-failure statuses (`0` = no HTTP response, `408` = client-side
 * timeout). Anything else (a 200, or even a 5xx) means the server answered, so the
 * suite should run and assert. Keying the skip on transport status — never on
 * assertions — means a real contract drift (host up, response changed) still fails
 * loudly instead of being masked as "down".
 *
 * Used with `describe.skipIf(...)` so an upstream outage yellows the run (skipped)
 * rather than reding it (failed).
 */
import { FideService, OrganizationService } from '@msvens/schack-se-sdk';

const PROBE_TIMEOUT_MS = 2500;

/**
 * Absolute upstream bases. The app itself talks to same-origin `/api/*` (see
 * `src/lib/api/init.ts`), but there is no proxy in a Node test run, so these
 * suites address the real hosts directly. That is the point: they assert the
 * upstream contract our proxy configuration depends on.
 */
export const SSF_BASE = 'https://member.schack.se/public/api/v1';
export const CHESSTOOLS_BASE = 'https://api.chesstools.org';

async function probe(
	host: string,
	call: Promise<{ status: number; error?: string }>
): Promise<boolean> {
	const res = await call;
	const down = res.status === 0 || res.status === 408;
	// Announce only an outage. Write straight to stderr — Vitest intercepts
	// console.* during collection and drops it for a fully-skipped file.
	if (down) {
		process.stderr.write(
			`[integration] ${host} unreachable (status ${res.status}: ${res.error}); skipping live suite.\n`
		);
	}
	return down;
}

/** True when member.schack.se (SSF) can't be reached. */
export function ssfUnreachable(): Promise<boolean> {
	return probe(
		'member.schack.se (SSF)',
		new OrganizationService(SSF_BASE, PROBE_TIMEOUT_MS).getFederation()
	);
}

/** True when api.chesstools.org (FIDE) can't be reached. */
export function fideUnreachable(): Promise<boolean> {
	return probe(
		'api.chesstools.org (FIDE)',
		new FideService(CHESSTOOLS_BASE, PROBE_TIMEOUT_MS).getTopByRating(1)
	);
}
