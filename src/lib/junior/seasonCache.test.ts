import { describe, expect, it } from 'vitest';
import type { JgpSeason } from '$lib/data/jgp/types';
import type { JgpAgeClassTable } from './jgpEngine';
import { SeasonTableCache } from './seasonCache';

const season = (year: number, division: JgpSeason['division']): JgpSeason =>
	({ year, division }) as JgpSeason;

const tables = (label: string): JgpAgeClassTable[] => [
	{ ageClass: { label, fromYear: 0, toYear: 9999 }, rows: [] }
];

describe('SeasonTableCache', () => {
	it('returns what it was given for that season', () => {
		const cache = new SeasonTableCache();
		cache.set(season(2026, 'open'), tables('2013'));
		expect(cache.get(season(2026, 'open'))?.[0].ageClass.label).toBe('2013');
	});

	it('keys by year and division, not by season object', () => {
		// The page rebuilds its season on every division change, so identity is
		// exactly the wrong key.
		const cache = new SeasonTableCache();
		cache.set(season(2026, 'open'), tables('open'));

		expect(cache.get(season(2026, 'open'))?.[0].ageClass.label).toBe('open');
		expect(cache.get(season(2026, 'girls'))).toBeUndefined();
		expect(cache.get(season(2025, 'open'))).toBeUndefined();
	});
});
