import { describe, expect, it, vi } from 'vitest';
import type { JgpSeason } from '$lib/data/jgp/types';
import type { JgpAgeClassTable, JgpPlayerResult } from '$lib/junior/jgpEngine';
import { JgpStandingsState } from './jgpStandings.svelte';

const season = (over: Partial<JgpSeason> = {}): JgpSeason =>
	({
		year: 2026,
		division: 'open',
		scoring: 'ladder',
		tournaments: [],
		dispensations: [],
		clubExceptions: [],
		...over
	}) as JgpSeason;

const row = (over: Partial<JgpPlayerResult> = {}): JgpPlayerResult =>
	({ memberId: 1, clubId: 100, ...over }) as JgpPlayerResult;

const tables = (label: string): JgpAgeClassTable[] => [
	{ ageClass: { label, fromYear: 0, toYear: 9999 }, rows: [] }
];

describe('JgpStandingsState', () => {
	const getClub = () => undefined;

	it('loads a season and holds its tables', async () => {
		const loader = vi.fn().mockResolvedValue(tables('2013'));
		const state = new JgpStandingsState(loader);

		const pending = state.load(season(), getClub);
		expect(state.loading).toBe(true);
		await pending;

		expect(state.loading).toBe(false);
		expect(state.error).toBeNull();
		expect(state.tables?.[0].ageClass.label).toBe('2013');
	});

	it('hands the loader an eligibility predicate built from the season', async () => {
		const loader = vi.fn().mockResolvedValue([]);
		const state = new JgpStandingsState(loader);
		const withException = season({
			clubExceptions: [{ memberId: 7, name: 'Anna', stockholmClub: 'SK Rockaden' }]
		});

		await state.load(withException, getClub);

		const isEligible = loader.mock.calls[0][1] as (r: JgpPlayerResult) => boolean;
		expect(isEligible(row({ memberId: 7 }))).toBe(true);
		expect(isEligible(row({ memberId: 8 }))).toBe(false);
	});

	it('serves a season it has already computed without loading again', async () => {
		const loader = vi.fn().mockResolvedValue(tables('2013'));
		const state = new JgpStandingsState(loader);

		await state.load(season(), getClub);
		await state.load(season(), getClub);

		expect(loader).toHaveBeenCalledTimes(1);
		expect(state.tables?.[0].ageClass.label).toBe('2013');
		expect(state.loading).toBe(false);
	});

	it('is never left loading when a cached season is re-selected', async () => {
		// The cache path returns early, so it has to clear `loading` itself.
		const loader = vi.fn().mockResolvedValue(tables('2013'));
		const state = new JgpStandingsState(loader);

		await state.load(season(), getClub);
		const pending = state.load(season(), getClub);
		expect(state.loading).toBe(false);
		await pending;
		expect(state.loading).toBe(false);
	});

	it('caches per year and division, not per season object', async () => {
		const loader = vi.fn().mockResolvedValue([]);
		const state = new JgpStandingsState(loader);

		await state.load(season(), getClub);
		await state.load(season({ division: 'girls' }), getClub);
		await state.load(season({ year: 2025 }), getClub);
		// A fresh object for a season already computed still hits the cache.
		await state.load(season(), getClub);

		expect(loader).toHaveBeenCalledTimes(3);
	});

	it('reports a failure as a message and stops loading', async () => {
		const loader = vi.fn().mockRejectedValue(new Error('upstream said no'));
		const state = new JgpStandingsState(loader);

		await state.load(season(), getClub);

		expect(state.error).toBe('upstream said no');
		expect(state.loading).toBe(false);
		expect(state.tables).toBeNull();
	});

	it('does not cache a failure', async () => {
		const loader = vi
			.fn()
			.mockRejectedValueOnce(new Error('flaky'))
			.mockResolvedValueOnce(tables('2013'));
		const state = new JgpStandingsState(loader);

		await state.load(season(), getClub);
		await state.load(season(), getClub);

		expect(loader).toHaveBeenCalledTimes(2);
		expect(state.error).toBeNull();
		expect(state.tables?.[0].ageClass.label).toBe('2013');
	});

	it('ignores a slow load once a newer one has started', async () => {
		let resolveSlow!: (value: JgpAgeClassTable[]) => void;
		const loader = vi
			.fn()
			.mockReturnValueOnce(new Promise<JgpAgeClassTable[]>((r) => (resolveSlow = r)))
			.mockResolvedValueOnce(tables('girls'));
		const state = new JgpStandingsState(loader);

		const slow = state.load(season(), getClub);
		await state.load(season({ division: 'girls' }), getClub);
		resolveSlow(tables('open'));
		await slow;

		expect(state.tables?.[0].ageClass.label).toBe('girls');
		expect(state.loading).toBe(false);
	});
});
