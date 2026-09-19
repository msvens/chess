/**
 * Seed order for a group that has not produced standings yet.
 *
 * SSF returns rows in arbitrary order — with `place: NO_PLACE` and `points: 0`
 * for everyone — until results exist, and the SDK passes that through. So the
 * order a start list is read in has to be supplied here. schack.se does the same
 * on its own side; this reproduces what it shows.
 *
 * The key is `getPlayerRatingByAlgorithm`, the *same* number the Rating column
 * renders, rather than the rating implied by the tournament's time control.
 * Sorting by a figure the reader cannot see reads as a broken table, and on live
 * data (group 19044) this matched the official start list exactly while the
 * time-control variant did not.
 *
 * Ranking algorithms LASK (3) and NO_RATING (5) yield a null rating for every
 * player, so the order collapses to alphabetical. That is deliberate and
 * self-consistent: those groups show `-` in the Rating column for everyone too.
 */
import { getPlayerRatingByAlgorithm, type TournamentEndResultDto } from '$lib/api';

const lastNameOf = (row: TournamentEndResultDto) => row.playerInfo?.lastName ?? '';

/**
 * Rows ordered by rating descending, unrated last and alphabetical among
 * themselves. Pure — the input array is left untouched.
 */
export function seedOrder<T extends TournamentEndResultDto>(
	rows: readonly T[],
	rankingAlgorithm?: number | null
): T[] {
	// A missing rating and a literal 0 both mean "unrated at this date", and both
	// have to land at the bottom rather than at the top of a descending sort.
	const ratingOf = (row: T) =>
		getPlayerRatingByAlgorithm(row.playerInfo?.elo, rankingAlgorithm).rating ?? 0;

	return [...rows].sort((a, b) => {
		const byRating = ratingOf(b) - ratingOf(a);
		if (byRating !== 0) return byRating;
		// Swedish collation, because these are Swedish start lists: å/ä/ö sort
		// after z, as they do on the official page.
		return lastNameOf(a).localeCompare(lastNameOf(b), 'sv');
	});
}
