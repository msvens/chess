import { describe, expect, it } from 'vitest';
import type { TournamentDto } from '$lib/api';
import { districtCounts, districtsOf, filterByDistrict } from './tournamentDistricts';

const STOCKHOLM = 7;
const SKANE = 12;

const tournament = (id: number, orgNumber: number, orgType = 1): TournamentDto =>
	({ id, name: `Tournament ${id}`, orgType, orgNumber }) as TournamentDto;

/** Clubs 100 and 101 are Stockholm, 200 is Skåne, 300 belongs to nobody. */
const lookup = (_orgType: number, orgNumber: number): number | null =>
	({ 100: STOCKHOLM, 101: STOCKHOLM, 200: SKANE })[orgNumber] ?? null;

const three = [tournament(1, 100), tournament(2, 200), tournament(3, 300)];
const districts = districtsOf(three, lookup);

describe('resolving a tournament to its district', () => {
	it('goes through the organiser, which is all the API gives', () => {
		expect(districts.get(1)).toBe(STOCKHOLM);
		expect(districts.get(2)).toBe(SKANE);
	});

	it('records a districtless organiser as null rather than omitting it', () => {
		// Omitting it would make the tournament invisible to every filter branch.
		expect(districts.has(3)).toBe(true);
		expect(districts.get(3)).toBeNull();
	});

	it('passes the organiser type through — a club and a district can share a number', () => {
		const seen: [number, number][] = [];
		districtsOf([tournament(1, 100, 2)], (orgType, orgNumber) => {
			seen.push([orgType, orgNumber]);
			return null;
		});
		expect(seen).toEqual([[2, 100]]);
	});
});

describe('filtering by district', () => {
	it('keeps everything when no district is chosen', () => {
		expect(filterByDistrict(three, districts, null)).toHaveLength(3);
	});

	it('keeps one district', () => {
		expect(filterByDistrict(three, districts, STOCKHOLM).map((t) => t.id)).toEqual([1]);
	});

	it('keeps only the districtless under Övriga', () => {
		// -1 is a bucket, not a district id, so this cannot be an equality test.
		expect(filterByDistrict(three, districts, -1).map((t) => t.id)).toEqual([3]);
	});

	it('treats a tournament missing from the map as districtless', () => {
		// A tournament that arrived after the map was built must not vanish.
		const unknown = [...three, tournament(4, 999)];
		expect(filterByDistrict(unknown, districts, -1).map((t) => t.id)).toEqual([3, 4]);
	});

	it('does not hand back the caller’s array', () => {
		const all = filterByDistrict(three, districts, null);
		expect(all).not.toBe(three);
	});
});

describe('counting per district', () => {
	it('counts each district', () => {
		const counts = districtCounts(
			[tournament(1, 100), tournament(2, 101), tournament(3, 200)],
			districtsOf([tournament(1, 100), tournament(2, 101), tournament(3, 200)], lookup)
		);
		expect(counts).toContainEqual({ districtId: STOCKHOLM, count: 2 });
		expect(counts).toContainEqual({ districtId: SKANE, count: 1 });
	});

	it('gathers the districtless under null, which is the Övriga count', () => {
		expect(districtCounts(three, districts)).toContainEqual({ districtId: null, count: 1 });
	});

	it('lists no district that has nothing in it', () => {
		const counts = districtCounts([tournament(1, 100)], districts);
		expect(counts.map((c) => c.districtId)).toEqual([STOCKHOLM]);
	});

	it('counts nothing for an empty set', () => {
		expect(districtCounts([], districts)).toEqual([]);
	});
});
