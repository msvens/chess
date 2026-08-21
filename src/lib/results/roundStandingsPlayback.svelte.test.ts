import { describe, expect, it, vi } from 'vitest';
import type { RoundStandings } from '$lib/api';
import { createRoundStandingsPlayback } from './roundStandingsPlayback.svelte';

const snapshot = (round: number): RoundStandings =>
	({ round, rows: [], estimated: true, secondaryBasis: 'indicative' }) as RoundStandings;

const ok = (rounds: number[]) => ({ status: 200, data: rounds.map(snapshot) });

/** Resolves only when the test says so, for asserting on the in-flight window. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
}

function setup(getRoundStandings = vi.fn().mockResolvedValue(ok([1, 2, 3]))) {
	const playback = createRoundStandingsPlayback({ results: { getRoundStandings } });
	return { playback, getRoundStandings };
}

describe('createRoundStandingsPlayback', () => {
	it('is off and fetches nothing until asked', () => {
		const { playback, getRoundStandings } = setup();
		expect(playback.enabled).toBe(false);
		expect(getRoundStandings).not.toHaveBeenCalled();
	});

	it('fetches a group on the first ensure', async () => {
		const { playback, getRoundStandings } = setup();
		playback.setEnabled(true);
		playback.ensure(100);
		await vi.waitFor(() => expect(playback.loading).toBe(false));
		expect(getRoundStandings).toHaveBeenCalledWith(100);
	});

	it('serves the snapshot for a round once loaded', async () => {
		const { playback } = setup();
		playback.setEnabled(true);
		playback.ensure(100);
		await vi.waitFor(() => expect(playback.loading).toBe(false));
		expect(playback.snapshot(100, 2)?.round).toBe(2);
	});

	it('has no snapshot for a round the event never played', async () => {
		const { playback } = setup();
		playback.setEnabled(true);
		playback.ensure(100);
		await vi.waitFor(() => expect(playback.loading).toBe(false));
		expect(playback.snapshot(100, 9)).toBeNull();
	});

	// The route drives `ensure` from an effect, so it runs on every unrelated
	// dependency change. Refetching there would be one request per keystroke.
	it('does not refetch a group it already holds', async () => {
		const { playback, getRoundStandings } = setup();
		playback.setEnabled(true);
		playback.ensure(100);
		await vi.waitFor(() => expect(playback.loading).toBe(false));
		playback.ensure(100);
		playback.ensure(100);
		expect(getRoundStandings).toHaveBeenCalledTimes(1);
	});

	it('does not start a second fetch while one is in flight', async () => {
		const pending = deferred<{ status: number; data: RoundStandings[] }>();
		const getRoundStandings = vi.fn().mockReturnValue(pending.promise);
		const { playback } = setup(getRoundStandings);
		playback.setEnabled(true);

		playback.ensure(100);
		playback.ensure(100);
		expect(getRoundStandings).toHaveBeenCalledTimes(1);

		pending.resolve(ok([1]));
		await vi.waitFor(() => expect(playback.loading).toBe(false));
	});

	it('fetches again when the visitor switches group', async () => {
		const { playback, getRoundStandings } = setup();
		playback.setEnabled(true);
		playback.ensure(100);
		await vi.waitFor(() => expect(playback.loading).toBe(false));
		playback.ensure(200);
		await vi.waitFor(() => expect(getRoundStandings).toHaveBeenCalledTimes(2));
		expect(getRoundStandings).toHaveBeenLastCalledWith(200);
	});

	// Round numbers overlap between groups, so answering with what was loaded
	// last would show plausible standings belonging to another group.
	it('refuses to serve one group snapshots loaded for another', async () => {
		const { playback } = setup();
		playback.setEnabled(true);
		playback.ensure(100);
		await vi.waitFor(() => expect(playback.loading).toBe(false));
		expect(playback.snapshot(100, 1)).not.toBeNull();
		expect(playback.snapshot(200, 1)).toBeNull();
	});

	it('drops a response for a group already navigated away from', async () => {
		const first = deferred<{ status: number; data: RoundStandings[] }>();
		const getRoundStandings = vi
			.fn()
			.mockReturnValueOnce(first.promise)
			.mockResolvedValueOnce(ok([7]));
		const { playback } = setup(getRoundStandings);
		playback.setEnabled(true);

		playback.ensure(100);
		playback.ensure(200);
		await vi.waitFor(() => expect(playback.snapshot(200, 7)?.round).toBe(7));

		// The slow first response lands last, and must not overwrite group 200.
		first.resolve(ok([1, 2, 3]));
		await Promise.resolve();
		expect(playback.snapshot(200, 7)?.round).toBe(7);
		expect(playback.snapshot(100, 1)).toBeNull();
	});

	it('serves nothing while switched off, even holding snapshots', async () => {
		const { playback } = setup();
		playback.setEnabled(true);
		playback.ensure(100);
		await vi.waitFor(() => expect(playback.loading).toBe(false));

		playback.setEnabled(false);
		expect(playback.snapshot(100, 1)).toBeNull();
	});

	it('reports a non-200 as a failure rather than an empty playback', async () => {
		const getRoundStandings = vi.fn().mockResolvedValue({ status: 500, data: undefined });
		const { playback } = setup(getRoundStandings);
		playback.setEnabled(true);
		playback.ensure(100);

		await vi.waitFor(() => expect(playback.failed(100)).toBe(true));
		expect(playback.snapshot(100, 1)).toBeNull();
	});

	it('reports a thrown request as a failure', async () => {
		const getRoundStandings = vi.fn().mockRejectedValue(new Error('offline'));
		const { playback } = setup(getRoundStandings);
		playback.setEnabled(true);
		playback.ensure(100);

		await vi.waitFor(() => expect(playback.failed(100)).toBe(true));
		expect(playback.loading).toBe(false);
	});

	// The effect calling `ensure` re-runs constantly; retrying there would mean a
	// request per re-run against an endpoint that is already answering 500.
	it('does not retry a failed group on its own', async () => {
		const getRoundStandings = vi.fn().mockResolvedValue({ status: 500, data: undefined });
		const { playback } = setup(getRoundStandings);
		playback.setEnabled(true);
		playback.ensure(100);
		await vi.waitFor(() => expect(playback.failed(100)).toBe(true));

		playback.ensure(100);
		playback.ensure(100);
		expect(getRoundStandings).toHaveBeenCalledTimes(1);
	});

	it('retries when playback is switched off and on again', async () => {
		const getRoundStandings = vi
			.fn()
			.mockResolvedValueOnce({ status: 500, data: undefined })
			.mockResolvedValueOnce(ok([1]));
		const { playback } = setup(getRoundStandings);
		playback.setEnabled(true);
		playback.ensure(100);
		await vi.waitFor(() => expect(playback.failed(100)).toBe(true));

		playback.setEnabled(false);
		playback.setEnabled(true);
		playback.ensure(100);
		await vi.waitFor(() => expect(playback.snapshot(100, 1)?.round).toBe(1));
		expect(playback.failed(100)).toBe(false);
	});

	it('keeps a failure scoped to the group it happened on', async () => {
		const getRoundStandings = vi
			.fn()
			.mockResolvedValueOnce({ status: 500, data: undefined })
			.mockResolvedValueOnce(ok([1]));
		const { playback } = setup(getRoundStandings);
		playback.setEnabled(true);
		playback.ensure(100);
		await vi.waitFor(() => expect(playback.failed(100)).toBe(true));

		playback.ensure(200);
		await vi.waitFor(() => expect(playback.snapshot(200, 1)?.round).toBe(1));
		expect(playback.failed(200)).toBe(false);
		expect(playback.failed(100)).toBe(true);
	});
});
