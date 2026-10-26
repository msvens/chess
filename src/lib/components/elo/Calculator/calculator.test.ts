import { describe, expect, it, vi } from 'vitest';
import type { MfidePlayer, MfideTopEntry, PlayerInfoDto } from '$lib/api';
import {
	DEFAULT_RATING,
	activeRating,
	fromFidePlayer,
	fromSsfPlayer,
	resolveKFactor,
	selectedRating,
	topListLoader,
	type LookedUpPlayer,
	type PlayerSelection
} from './calculator';

const lookedUp = (over: Partial<LookedUpPlayer> = {}): LookedUpPlayer => ({
	name: 'Test Player',
	ratings: { standard: 2000, rapid: 1900, blitz: 0 },
	kFactors: null,
	birthYear: null,
	...over
});

const selection = (over: Partial<PlayerSelection> = {}): PlayerSelection => ({
	manualRating: '',
	lookedUp: null,
	...over
});

describe('activeRating', () => {
	it('picks the rating for the chosen time control', () => {
		expect(activeRating(lookedUp(), 'rapid')).toMatchObject({ rating: 1900, usingDefault: false });
	});

	it('falls back to 1400 and says so when that type is unrated', () => {
		expect(activeRating(lookedUp(), 'blitz')).toMatchObject({
			rating: DEFAULT_RATING,
			usingDefault: true
		});
	});

	it('carries the profile K for that type only', () => {
		const player = lookedUp({ kFactors: { standard: 10, rapid: null, blitz: null } });
		expect(activeRating(player, 'standard').profileKFactor).toBe(10);
		expect(activeRating(player, 'rapid').profileKFactor).toBeNull();
	});
});

describe('selectedRating', () => {
	it('prefers the lookup over whatever was typed', () => {
		const active = selectedRating(
			selection({ manualRating: '1234', lookedUp: lookedUp() }),
			'standard'
		);
		expect(active?.rating).toBe(2000);
	});

	it('parses a typed rating', () => {
		expect(selectedRating(selection({ manualRating: '1850' }), 'standard')).toMatchObject({
			rating: 1850,
			profileKFactor: null
		});
	});

	it('is null for nothing, junk, or a non-positive number', () => {
		for (const manualRating of ['', 'abc', '0', '-5']) {
			expect(selectedRating(selection({ manualRating }), 'standard')).toBeNull();
		}
	});
});

describe('resolveKFactor', () => {
	const active = { rating: 2000, usingDefault: false, profileKFactor: null };

	it('manual wins, defaulting to 20 when unparseable', () => {
		expect(resolveKFactor(selection(), active, 'standard', '40')).toEqual({
			k: 40,
			fromProfile: false
		});
		expect(resolveKFactor(selection(), active, 'standard', '')).toEqual({
			k: 20,
			fromProfile: false
		});
	});

	it('then the profile K', () => {
		expect(
			resolveKFactor(selection(), { ...active, profileKFactor: 10 }, 'standard', null)
		).toEqual({ k: 10, fromProfile: true });
	});

	it('then an estimate from the rating: 20 below 2400, 10 at or above', () => {
		expect(resolveKFactor(selection(), active, 'standard', null).k).toBe(20);
		expect(resolveKFactor(selection(), { ...active, rating: 2450 }, 'standard', null).k).toBe(10);
	});

	it('applies the junior rule from a FIDE birth year', () => {
		const junior = selection({ lookedUp: lookedUp({ birthYear: new Date().getFullYear() - 10 }) });
		expect(resolveKFactor(junior, active, 'standard', null).k).toBe(40);
	});

	it('does not apply the junior rule once the lookup is gone', () => {
		// The bug this guards: in the Next app a FIDE birth year survived switching
		// to manual input, so a typed rating silently got K=40.
		expect(resolveKFactor(selection({ manualRating: '2000' }), active, 'standard', null).k).toBe(
			20
		);
	});
});

describe('mapping lookups', () => {
	it('reads an SSF player, treating K=0 as no K', () => {
		const player = {
			firstName: 'Anna',
			lastName: 'Svensson',
			elo: { rating: 2100, rapidRating: 2050, blitzRating: 0, k: 20, rapidk: 0, blitzK: 40 }
		} as PlayerInfoDto;
		expect(fromSsfPlayer(player)).toEqual({
			name: 'Anna Svensson',
			ratings: { standard: 2100, rapid: 2050, blitz: 0 },
			kFactors: { standard: 20, rapid: null, blitz: 40 },
			birthYear: null
		});
	});

	it('reads a FIDE player with every rating, FIDE’s K for each, and the birth year', () => {
		const player = {
			name: 'Carlsen, Magnus',
			country: 'NOR',
			title: 'GM',
			womenTitle: '',
			birthYear: 1990,
			standard: { rating: 2830, games: 0, k: 10, active: true },
			rapid: { rating: 2820, games: 9, k: 10, active: true },
			blitz: { rating: 2880, games: 21, k: 10, active: true }
		} as MfidePlayer;
		expect(fromFidePlayer(player)).toEqual({
			name: 'GM Carlsen, Magnus (NOR)',
			ratings: { standard: 2830, rapid: 2820, blitz: 2880 },
			kFactors: { standard: 10, rapid: 10, blitz: 10 },
			birthYear: 1990
		});
	});

	it('reads an unrated type as 0, so the default rating and estimated K apply', () => {
		const player = {
			name: 'Nobody',
			country: '',
			title: '',
			womenTitle: '',
			birthYear: null,
			standard: { rating: 1600, games: 5, k: 40, active: true },
			rapid: null,
			blitz: null
		} as MfidePlayer;
		const looked = fromFidePlayer(player);
		expect(looked.ratings).toEqual({ standard: 1600, rapid: 0, blitz: 0 });
		expect(activeRating(looked, 'blitz')).toMatchObject({
			rating: DEFAULT_RATING,
			usingDefault: true,
			profileKFactor: null
		});
	});
});

describe('topListLoader', () => {
	const row = { fideId: 1, rank: 1 } as MfideTopEntry;

	it('fetches each list and type once', async () => {
		const fetchTop = vi.fn().mockResolvedValue({ status: 200, data: [row] });
		const load = topListLoader(fetchTop);
		await Promise.all([load('open', 'standard'), load('open', 'standard')]);
		expect(await load('open', 'standard')).toEqual([row]);
		await load('women', 'standard');
		await load('open', 'blitz');
		expect(fetchTop.mock.calls).toEqual([
			['open', 'standard'],
			['women', 'standard'],
			['open', 'blitz']
		]);
	});

	it('yields an empty list on failure, and fetches again next time', async () => {
		const fetchTop = vi
			.fn()
			.mockResolvedValueOnce({ status: 0 })
			.mockResolvedValueOnce({ status: 200, data: [row] });
		const load = topListLoader(fetchTop);
		expect(await load('girls', 'rapid')).toEqual([]);
		expect(await load('girls', 'rapid')).toEqual([row]);
		expect(fetchTop).toHaveBeenCalledTimes(2);
	});
});
