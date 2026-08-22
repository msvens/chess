/**
 * Option lists for the tournament filters and the district filter.
 *
 * Each label carries its count in brackets when counts are supplied, so the user
 * can see what a filter would leave before selecting it. Pure, and tested.
 */
import type { getTranslation } from '$lib/translations';
import type { SelectableListItem } from '$lib/components/ui/listItems';
import {
	getAllTournamentTypes,
	getTournamentTypeKey,
	type CategoryCounts,
	type StateCounts,
	type TypeCounts
} from '$lib/utils/tournamentFilters';
import { TournamentState } from '$lib/api';
import type { DistrictDTO } from '$lib/api';

type T = ReturnType<typeof getTranslation>;

/** "Team (12)", or just "Team" when there is nothing to count. */
function withCount(label: string, count: number | undefined): string {
	return count === undefined ? label : `${label} (${count})`;
}

export function categoryItems(t: T, counts?: CategoryCounts): SelectableListItem[] {
	const c = t.components.tournamentCategoryFilter;
	return [
		{ id: 'all', label: withCount(t.common.filters.all, counts?.all) },
		{ id: 'team', label: withCount(c.team, counts?.team) },
		{ id: 'individual', label: withCount(c.individual, counts?.individual) }
	];
}

export function typeItems(t: T, counts?: TypeCounts): SelectableListItem[] {
	const ty = t.components.tournamentTypeFilter;
	const items: SelectableListItem[] = [
		{ id: 'all', label: withCount(t.common.filters.all, counts?.all) }
	];

	// The type list and its translation keys come from tournamentFilters, so adding
	// a tournament type upstream shows up here without touching this file.
	for (const type of getAllTournamentTypes()) {
		const count = counts?.[type];
		// Hide a type nobody in the current result set has — a filter that would
		// always come back empty is noise.
		if (counts && !count) continue;
		const key = getTournamentTypeKey(type) as keyof typeof ty;
		items.push({ id: type, label: withCount(ty[key] || `Type ${type}`, count) });
	}

	return items;
}

export function stateItems(t: T, counts?: StateCounts): SelectableListItem[] {
	const s = t.components.tournamentStateFilter;
	const items: SelectableListItem[] = [
		{ id: 'all', label: withCount(t.common.filters.all, counts?.all) }
	];
	const states: [number, string, number | undefined][] = [
		[TournamentState.REGISTRATION, s.registration, counts?.registration],
		[TournamentState.STARTED, s.started, counts?.started],
		[TournamentState.FINISHED, s.finished, counts?.finished]
	];
	for (const [id, label, count] of states) {
		if (counts && !count) continue;
		items.push({ id, label: withCount(label, count) });
	}
	return items;
}

export interface DistrictCount {
	/** null means "no district" — the Övriga bucket. */
	districtId: number | null;
	count: number;
}

/** The sentinel the district filter reports for "Övriga" (no district). */
export const OVRIGA = -1;

export function districtItems(
	t: T,
	districts: DistrictDTO[],
	counts?: DistrictCount[],
	totalCount?: number
): SelectableListItem[] {
	const d = t.components.districtFilter;
	// With counts supplied, drop districts that have nothing in the current set.
	const visible = counts
		? districts.filter((district) =>
				counts.some((c) => c.districtId === district.id && c.count > 0)
			)
		: districts;

	const items: SelectableListItem[] = [
		{
			id: 'all',
			label: totalCount === undefined ? d.allDistricts : `${t.common.filters.all} (${totalCount})`,
			tooltip: d.showAll
		},
		...visible.map((district) => ({
			id: district.id,
			label: withCount(district.name, counts?.find((c) => c.districtId === district.id)?.count),
			tooltip: district.name
		}))
	];

	const ovriga = counts?.find((c) => c.districtId === null)?.count;
	if (ovriga) {
		items.push({
			id: 'ovriga',
			label: `${d.other} (${ovriga})`,
			tooltip: d.tournamentsWithoutDistrict
		});
	}

	return items;
}

/** Map the list's id back to the district id the caller works in. */
export function toDistrictId(id: string | number): number | null {
	if (id === 'all') return null;
	if (id === 'ovriga') return OVRIGA;
	return Number(id);
}

/** And back again, for highlighting the current selection. */
export function toDistrictListId(districtId: number | null): string | number {
	if (districtId === OVRIGA) return 'ovriga';
	return districtId ?? 'all';
}
