import { describe, expect, it } from 'vitest';
import type { FideActivePlayer, FidePlayer, FidePlayerInfo, PlayerInfoDto } from '$lib/api';
import {
	DEFAULT_RATING,
	activeRating,
	expectedScore,
	fromFideActivePlayer,
	fromFidePlayerInfo,
	fromFideSearchHit,
	fromSsfPlayer,
	ratingChange,
	resolveKFactor,
	selectedRating,
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

	it('reads a FIDE profile from its latest history period', () => {
		const info = {
			name: 'Carlsen, Magnus',
			federation: 'Norway',
			fide_title: 'Grandmaster',
			birth_year: 1990,
			history: [
				{ classical_rating: 2830, rapid_rating: 2820, blitz_rating: 2880 },
				{ classical_rating: 2840, rapid_rating: 2830, blitz_rating: 2890 }
			]
		} as FidePlayerInfo;
		expect(fromFidePlayerInfo(info)).toEqual({
			name: 'GM Carlsen, Magnus (NOR)',
			ratings: { standard: 2830, rapid: 2820, blitz: 2880 },
			kFactors: null,
			birthYear: 1990
		});
	});

	it('reads a FIDE profile without history as unrated', () => {
		const info = { name: 'Nobody', federation: '', fide_title: 'None' } as FidePlayerInfo;
		expect(fromFidePlayerInfo(info)).toMatchObject({
			name: 'Nobody',
			ratings: { standard: 0, rapid: 0, blitz: 0 },
			birthYear: null
		});
	});

	it('reads a search hit as classical-only, with whichever title it carries', () => {
		const hit = { name: 'Hou, Yifan', w_title: 'WGM', rating: 2600 } as FidePlayer;
		expect(fromFideSearchHit(hit)).toMatchObject({
			name: 'WGM Hou, Yifan',
			ratings: { standard: 2600, rapid: 0, blitz: 0 }
		});
	});

	it('reads a top-list row, whose rating is a string', () => {
		const row = { name: 'Carlsen, Magnus', country: 'NOR', rating: '2830' } as FideActivePlayer;
		expect(fromFideActivePlayer(row)).toMatchObject({
			name: 'Carlsen, Magnus (NOR)',
			ratings: { standard: 2830, rapid: 0, blitz: 0 }
		});
	});
});

describe('the 400-point cap', () => {
	it('capped: a 1000-point gap scores the same as a 400-point gap', () => {
		expect(expectedScore(2400, 1400, true)).toBeCloseTo(expectedScore(1800, 1400, true), 10);
	});

	it('uncapped: the gap keeps counting', () => {
		expect(expectedScore(2400, 1400, false)).toBeGreaterThan(expectedScore(1800, 1400, false));
		expect(expectedScore(2400, 1400, false)).toBeCloseTo(0.9968, 3);
	});

	it('agrees with the SDK inside the cap either way', () => {
		expect(expectedScore(1500, 1600, false)).toBeCloseTo(expectedScore(1500, 1600, true), 10);
		expect(ratingChange(1500, 1600, 1, 20, false)).toBeCloseTo(
			ratingChange(1500, 1600, 1, 20, true),
			10
		);
	});

	it('uncapped change is K × (S − E), to a tenth like the SDK', () => {
		expect(ratingChange(2400, 1400, 0, 10, false)).toBe(-10);
		expect(ratingChange(2400, 1400, 0, 40, false)).toBe(-39.9);
	});
});
