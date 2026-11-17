/**
 * Which clubs count, for the organisation pages and the sitemap.
 *
 * A plain module, not part of the organisations store, so the build-time sitemap
 * script can use the same rule from Node: it may import types only.
 */
import type { ClubDTO } from '$lib/api';

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
