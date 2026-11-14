import { describe, expect, it, vi } from 'vitest';
import type { ApiResponse, TournamentDto } from '$lib/api';
import type { JgpSeasonStandings } from '$lib/api/sthlm';
import { JgpStandingsState } from './jgpStandings.svelte';

const standings = (label: string, tournamentIds = [6544]): ApiResponse<JgpSeasonStandings> => ({
	status: 200,
	data: {
		lastUpdated: '2026-11-13T19:32:59+00:00',
		tournamentIds,
		tables: [{ label, rows: [] }]
	}
});

const tournament = (id: number, name: string): TournamentDto =>
	({ id, name, start: '2026-03-07' }) as TournamentDto;

const tournaments = vi.fn().mockResolvedValue([tournament(6544, 'Tyresö JGP 2026')]);

describe('JgpStandingsState', () => {
	it('loads a division with its tournaments named and dated', async () => {
		const state = new JgpStandingsState(vi.fn().mockResolvedValue(standings('2013')), tournaments);

		const pending = state.load('open');
		expect(state.loading).toBe(true);
		await pending;

		expect(state.loading).toBe(false);
		expect(state.error).toBeNull();
		expect(state.tables?.[0].label).toBe('2013');
		expect(state.lastUpdated).toBe('2026-11-13T19:32:59+00:00');
		expect(state.tournaments).toEqual([{ id: 6544, name: 'Tyresö JGP 2026', date: '2026-03-07' }]);
	});

	it('still shows the standings when a tournament cannot be looked up', async () => {
		const state = new JgpStandingsState(
			vi.fn().mockResolvedValue(standings('2013', [6544, 9999])),
			vi.fn().mockResolvedValue([tournament(6544, 'Tyresö JGP 2026'), null])
		);

		await state.load('open');

		expect(state.error).toBeNull();
		expect(state.tournaments[1]).toEqual({ id: 9999, name: '9999', date: '' });
	});

	it('serves a division it has already loaded without fetching again', async () => {
		const fetcher = vi.fn().mockResolvedValue(standings('2013'));
		const state = new JgpStandingsState(fetcher, tournaments);

		await state.load('open');
		const pending = state.load('open');
		// The cache path returns early, so it has to clear `loading` itself.
		expect(state.loading).toBe(false);
		await pending;

		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(state.tables?.[0].label).toBe('2013');
	});

	it('caches each division separately', async () => {
		const fetcher = vi
			.fn()
			.mockImplementation((division: string) => Promise.resolve(standings(division)));
		const state = new JgpStandingsState(fetcher, tournaments);

		await state.load('open');
		await state.load('girls');
		await state.load('open');

		expect(fetcher).toHaveBeenCalledTimes(2);
		expect(state.tables?.[0].label).toBe('open');
	});

	it('reports a failure and stops loading, without caching it', async () => {
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce({ error: 'HTTP 502', status: 502 })
			.mockResolvedValueOnce(standings('2013'));
		const state = new JgpStandingsState(fetcher, tournaments);

		await state.load('open');
		expect(state.error).toBe('HTTP 502');
		expect(state.loading).toBe(false);
		expect(state.tables).toBeNull();

		await state.load('open');
		expect(fetcher).toHaveBeenCalledTimes(2);
		expect(state.error).toBeNull();
	});

	it('ignores a slow load once a newer one has started', async () => {
		let resolveSlow!: (value: ApiResponse<JgpSeasonStandings>) => void;
		const fetcher = vi
			.fn()
			.mockReturnValueOnce(new Promise((resolve) => (resolveSlow = resolve)))
			.mockResolvedValueOnce(standings('girls'));
		const state = new JgpStandingsState(fetcher, tournaments);

		const slow = state.load('open');
		await state.load('girls');
		resolveSlow(standings('open'));
		await slow;

		expect(state.tables?.[0].label).toBe('girls');
		expect(state.loading).toBe(false);
	});
});
