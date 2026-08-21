import { describe, expect, it } from 'vitest';
import type { ClubDTO } from '$lib/api';
import {
	normalizeCity,
	resolveCity,
	resolveClubLocation,
	type ClubGeocodeData,
	type GeocodeData
} from '../geocodeLoader';

const cities: GeocodeData = {
	generatedAt: '2026-08-20T00:00:00.000Z',
	cities: {
		stockholm: { lat: 59.33, lng: 18.06 },
		'bräcke kommun': { lat: 62.75, lng: 15.42 }
	}
};

const clubPoints: ClubGeocodeData = {
	generatedAt: '2026-08-20T00:00:00.000Z',
	clubs: {
		'1': { lat: 59.34, lng: 18.07 },
		// A null entry is the negative cache: the address was tried and did not
		// resolve, so don't try again — fall back to the city.
		'2': null
	}
};

const club = (id: number, city?: string) => ({ id, name: `Club ${id}`, city }) as ClubDTO;

describe('normalizeCity', () => {
	it('lowercases and trims', () => {
		expect(normalizeCity('  Stockholm ')).toBe('stockholm');
	});

	it('collapses internal whitespace, so "Bräcke  kommun" matches', () => {
		expect(normalizeCity('Bräcke  kommun')).toBe('bräcke kommun');
	});

	it('treats null and undefined as empty', () => {
		expect(normalizeCity(null)).toBe('');
		expect(normalizeCity(undefined)).toBe('');
	});
});

describe('resolveCity', () => {
	it('finds a known city regardless of case or padding', () => {
		expect(resolveCity(cities, ' STOCKHOLM ')).toEqual({ lat: 59.33, lng: 18.06 });
	});

	it('returns null for an unknown city', () => {
		expect(resolveCity(cities, 'Atlantis')).toBeNull();
	});

	it('returns null for an empty city rather than matching an empty key', () => {
		expect(resolveCity(cities, '')).toBeNull();
		expect(resolveCity(cities, null)).toBeNull();
	});
});

describe('resolveClubLocation', () => {
	it('prefers the street-level coordinate when we have one', () => {
		expect(resolveClubLocation(clubPoints, cities, club(1, 'Stockholm'))).toEqual({
			lat: 59.34,
			lng: 18.07
		});
	});

	it('falls back to the city centre for a negative-cached club', () => {
		expect(resolveClubLocation(clubPoints, cities, club(2, 'Stockholm'))).toEqual({
			lat: 59.33,
			lng: 18.06
		});
	});

	it('falls back to the city centre for a club we never geocoded', () => {
		expect(resolveClubLocation(clubPoints, cities, club(99, 'Stockholm'))).toEqual({
			lat: 59.33,
			lng: 18.06
		});
	});

	// These are the clubs the "unmapped" list exists to surface — the real data has
	// city values like "x", "abc" and street addresses stuffed into the field.
	it('returns null when neither the address nor the city resolves', () => {
		expect(resolveClubLocation(clubPoints, cities, club(99, 'x'))).toBeNull();
		expect(resolveClubLocation(clubPoints, cities, club(99, undefined))).toBeNull();
	});

	it('returns null when the city table has not loaded, rather than throwing', () => {
		expect(resolveClubLocation(clubPoints, null, club(99, 'Stockholm'))).toBeNull();
		// A street-level hit still works without the city table.
		expect(resolveClubLocation(clubPoints, null, club(1, 'Stockholm'))).toEqual({
			lat: 59.34,
			lng: 18.07
		});
	});
});
