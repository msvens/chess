/**
 * Resolving a club or tournament to a point on the map.
 *
 * Ported from `lib/geo/geocodeLoader.ts`; the resolvers are unchanged. The React
 * hook that fetched the two JSON tables lives in `geocodes.svelte.ts` instead.
 */
import type { ClubDTO, TournamentDto } from '$lib/api';

export interface GeoPoint {
	lat: number;
	lng: number;
	label?: string;
}

export interface GeocodeData {
	generatedAt: string;
	cities: Record<string, GeoPoint>;
}

/**
 * Street-level club coordinates, keyed by club id (`scripts/geocode-clubs.ts`).
 * A `null` entry is a negative-cache marker (address didn't resolve) — resolved
 * the same as "no entry": fall back to the club's city.
 */
export interface ClubGeocodeData {
	generatedAt: string;
	clubs: Record<string, GeoPoint | null>;
}

/** Normalize a city name to a lookup key (lowercase, collapsed whitespace). */
export function normalizeCity(city: string | null | undefined): string {
	return (city ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Resolve a single city name to a point, or null if not in the table. */
export function resolveCity(data: GeocodeData, city: string | null | undefined): GeoPoint | null {
	const key = normalizeCity(city);
	return key ? (data.cities[key] ?? null) : null;
}

/**
 * Resolve a tournament's map location by its own city, falling back to the
 * supplied city (e.g. the organizing club's) when the tournament has none.
 */
export function resolveTournamentLocation(
	data: GeocodeData,
	tournament: TournamentDto,
	fallbackCity?: string | null
): GeoPoint | null {
	return resolveCity(data, tournament.city) ?? resolveCity(data, fallbackCity);
}

/**
 * Resolve a club's map location: its street-level coordinate if we geocoded it,
 * else its city centre, else null (unmapped). `cityData` is the GeoNames city
 * table used for the fallback.
 */
export function resolveClubLocation(
	clubData: ClubGeocodeData,
	cityData: GeocodeData | null,
	club: ClubDTO
): GeoPoint | null {
	const street = clubData.clubs[String(club.id)];
	if (street) return street;
	return cityData ? resolveCity(cityData, club.city) : null;
}
