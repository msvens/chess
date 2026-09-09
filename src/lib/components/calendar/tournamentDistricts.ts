/**
 * Grouping tournaments by the district that organises them.
 *
 * The API says who organises a tournament (`orgType` + `orgNumber`) but not
 * which district that organiser belongs to, so the calendar resolves it through
 * the organizations data and then filters and counts on the result.
 *
 * A module rather than three `$derived` blocks in the page: the two special ids
 * — `null` for "every district" and `-1` for the Övriga bucket — are the whole
 * of the logic, and they are much better pinned here than inferred from a
 * rendered dropdown.
 */
import type { TournamentDto } from '$lib/api';
import type { DistrictCount } from '$lib/components/filters/filterItems';

/** Resolves an organiser to its district, or null when it has none. */
export type DistrictOfOrganizer = (orgType: number, orgNumber: number) => number | null;

/** District per tournament id. `null` means the organiser belongs to no district. */
export function districtsOf(
	tournaments: readonly TournamentDto[],
	districtOfOrganizer: DistrictOfOrganizer
): Map<number, number | null> {
	const byTournament = new Map<number, number | null>();
	for (const tournament of tournaments) {
		byTournament.set(tournament.id, districtOfOrganizer(tournament.orgType, tournament.orgNumber));
	}
	return byTournament;
}

/**
 * The tournaments for one district selection.
 *
 * `null` is every district. `-1` is the Övriga bucket — the tournaments whose
 * organiser has no district — which is why this cannot be a plain equality test.
 */
export function filterByDistrict(
	tournaments: readonly TournamentDto[],
	districts: ReadonlyMap<number, number | null>,
	districtId: number | null
): TournamentDto[] {
	if (districtId === null) return [...tournaments];
	if (districtId === -1) {
		return tournaments.filter((tournament) => districts.get(tournament.id) == null);
	}
	return tournaments.filter((tournament) => districts.get(tournament.id) === districtId);
}

/**
 * How many tournaments each district has, with the districtless under `null`.
 *
 * The filter uses these both to show a count beside each district and to hide
 * the ones with nothing in them, so a tournament whose district is unknown must
 * land in the `null` bucket rather than being dropped.
 */
export function districtCounts(
	tournaments: readonly TournamentDto[],
	districts: ReadonlyMap<number, number | null>
): DistrictCount[] {
	const counts = new Map<number | null, number>();
	for (const tournament of tournaments) {
		const districtId = districts.get(tournament.id) ?? null;
		counts.set(districtId, (counts.get(districtId) ?? 0) + 1);
	}
	return [...counts].map(([districtId, count]) => ({ districtId, count }));
}
