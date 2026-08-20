/**
 * Districts and clubs, loaded once from the static JSON in `static/data/` and then
 * queried synchronously everywhere else.
 *
 * Ports `OrganizationsContext` (203 LOC). The seven `useCallback`s there existed only
 * to keep the context value referentially stable across renders; Svelte needs none of
 * them, so they are plain methods here.
 *
 * The lookup maps are built once and replaced wholesale, never mutated in place, so a
 * plain `Map` inside `$state` is enough — reactivity is only needed at the load
 * boundary. (Contrast the player cache, which IS mutated incrementally and therefore
 * needs `SvelteMap`.)
 *
 * Holds state + actions only — no `$effect` — so it can be unit-tested by
 * instantiating it directly. The root layout calls `load()`.
 */
import { getContext, setContext } from 'svelte';
import type { ClubDTO, DistrictDTO } from '$lib/api';
import {
	createOrganizationLookups,
	loadOrganizationData,
	type OrganizationLookups
} from '$lib/organizations/organizationDataLoader';

export interface ClubFilterOptions {
	activeOnly?: boolean;
	hasRatingPlayersOnly?: boolean;
}

/**
 * Pure club filter, exported for testing.
 *
 * "Active" means the club's MOST RECENT district membership is active — not that any
 * membership is. A club that left its district still carries the old rows, so checking
 * `.some(active)` would keep defunct clubs alive.
 */
export function filterClubs(clubs: ClubDTO[], options?: ClubFilterOptions): ClubDTO[] {
	if (!options) return clubs;

	return clubs.filter((club) => {
		if (options.hasRatingPlayersOnly && club.hasRatingPlayers !== 1) return false;

		if (options.activeOnly) {
			if (!club.districts || club.districts.length === 0) return false;
			const mostRecent = club.districts.reduce((latest, current) =>
				current.year > latest.year ? current : latest
			);
			if (mostRecent.active !== 1) return false;
		}

		return true;
	});
}

export class OrganizationsState {
	districts = $state<DistrictDTO[]>([]);
	loading = $state(true);
	error = $state<string | null>(null);

	/**
	 * Indexed lookups, or null until `load()` has run.
	 *
	 * Held as one nullable object rather than three `$state` Maps: the maps are built
	 * once by `createOrganizationLookups` and never mutated, so the only thing that
	 * needs to be reactive is whether the data has arrived. Reassigning this field is
	 * that signal.
	 */
	#lookups = $state<OrganizationLookups | null>(null);
	#loaded = false;

	/** Fetch and index the static org data. Safe to call more than once. */
	async load(): Promise<void> {
		if (this.#loaded) return;
		this.#loaded = true;
		this.loading = true;
		this.error = null;
		try {
			const data = await loadOrganizationData();
			const lookups = createOrganizationLookups(data);
			this.districts = data.districts;
			this.#lookups = lookups;
		} catch (err) {
			// Let a retry happen if this failed.
			this.#loaded = false;
			this.error = err instanceof Error ? err.message : 'Failed to load organization data';
		} finally {
			this.loading = false;
		}
	}

	getClub(clubId: number): ClubDTO | undefined {
		return this.#lookups?.clubMap.get(clubId);
	}

	getDistrict(districtId: number): DistrictDTO | undefined {
		return this.#lookups?.districtMap.get(districtId);
	}

	getClubName(orgNumber: number): string {
		// orgNumber 1 is the federation itself, which is not in the club data.
		if (orgNumber === 1) return 'Sveriges Schackförbund';
		return this.#lookups?.clubMap.get(orgNumber)?.name ?? `Org ${orgNumber}`;
	}

	/** Resolve an organizer, which may be the federation, a district or a club. */
	getOrganizerName(orgType: number, orgNumber: number): string {
		if (orgType === -1 || orgNumber === 1) return 'Sveriges Schackförbund';
		if (orgType === 0) return this.#lookups?.districtMap.get(orgNumber)?.name ?? '-';
		// orgType 1 = club, but ids overlap, so fall back to districts before giving up.
		const l = this.#lookups;
		return l?.clubMap.get(orgNumber)?.name ?? l?.districtMap.get(orgNumber)?.name ?? '-';
	}

	getDistrictIdForOrganizer(orgType: number, orgNumber: number): number | null {
		if (orgType === -1 || orgNumber === 1) return null;
		if (orgType === 0) return orgNumber; // the orgNumber IS the district id
		if (orgType === 1) return this.#lookups?.clubDistrictMap.get(orgNumber) ?? null;
		return null;
	}

	getAllClubs(options?: ClubFilterOptions): ClubDTO[] {
		return filterClubs(Array.from(this.#lookups?.clubMap.values() ?? []), options);
	}

	getClubsByDistrict(districtId: number, options?: ClubFilterOptions): ClubDTO[] {
		const inDistrict = Array.from(this.#lookups?.clubMap.values() ?? []).filter((club) =>
			club.districts?.some((m) => m.districtid === districtId && m.active === 1)
		);
		return filterClubs(inDistrict, options);
	}
}

export const ORGANIZATIONS_STATE_KEY = Symbol('organizations-state');

export function setOrganizationsState(state = new OrganizationsState()): OrganizationsState {
	setContext(ORGANIZATIONS_STATE_KEY, state);
	return state;
}

export function getOrganizationsState(): OrganizationsState {
	return getContext<OrganizationsState>(ORGANIZATIONS_STATE_KEY);
}
