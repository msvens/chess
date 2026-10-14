/**
 * The inputs and rating lookups the SDK's `getIndividualPerformance` needs.
 * Whether a tournament has a list at all is the SDK's `hasIndividualPerformance`.
 *
 * Pure, so the request-saving rule — which ratings the results tables already
 * answer — is tested without a store or a network.
 */
import {
	getIndividualPerformanceLookups,
	getMonthStartString,
	normalizeEloLookupDate,
	type IndividualPerformanceLookup,
	type PlayerInfoDto,
	type TournamentDto,
	type TournamentRoundResultDto
} from '$lib/api';
import type { PrintGroupData } from '$lib/print/printData';
import { parseDateToTimestamp } from './roundGrouping';
import { homeIsWhiteOnBoard } from './teamMatches';

/** What the list is built from: each group's rounds, and what is known about its players. */
export interface PerformanceInputs {
	roundResults: Map<number, TournamentRoundResultDto[]>;
	/**
	 * Each player as an individual group's results table has them — one rating
	 * list, dated by `elo.date`. Team tables carry no player records.
	 */
	snapshot: Map<number, PlayerInfoDto>;
	/**
	 * In a team event, the club of the team each player sat for — what the
	 * official list shows, which is not always the player's own club.
	 */
	teamClub: Map<number, string>;
	/**
	 * The date of each player's first game, for players no results table
	 * covers — the month their name and club are looked up at.
	 */
	firstGame: Map<number, string>;
}

/** Individual and team groups; Schackfyran-format groups carry no rounds to use. */
export function performanceInputs(groups: readonly PrintGroupData[]): PerformanceInputs {
	const used = groups.filter((group) => group.kind === 'individual' || group.kind === 'team');
	const snapshot = new Map<number, PlayerInfoDto>();
	const teamClub = new Map<number, string>();

	for (const group of used) {
		for (const [id, player] of group.playerMap) snapshot.set(id, player);
		if (group.kind !== 'team') continue;

		const clubOfContender = new Map(
			group.teamStandings.map((row) => [row.contenderId, row.club?.name ?? row.team?.name])
		);
		for (const row of group.roundResults) {
			for (const game of row.games ?? []) {
				const homeIsWhite = homeIsWhiteOnBoard(game.tableNr);
				const sides: [number, number][] = [
					[homeIsWhite ? game.whiteId : game.blackId, row.homeId],
					[homeIsWhite ? game.blackId : game.whiteId, row.awayId]
				];
				for (const [playerId, contenderId] of sides) {
					const club = clubOfContender.get(contenderId);
					if (playerId > 0 && club && !teamClub.has(playerId)) teamClub.set(playerId, club);
				}
			}
		}
	}

	const firstGame = new Map<number, string>();
	for (const group of used) {
		for (const row of group.roundResults) {
			for (const game of row.games ?? []) {
				for (const playerId of [game.whiteId, game.blackId]) {
					if (playerId <= 0 || snapshot.has(playerId) || !row.date) continue;
					const seen = firstGame.get(playerId);
					if (!seen || row.date < seen) firstGame.set(playerId, row.date);
				}
			}
		}
	}

	return {
		roundResults: new Map(used.map((group) => [group.group.id, group.roundResults])),
		snapshot,
		teamClub,
		firstGame
	};
}

/**
 * The rating lookups the results tables do not already answer.
 *
 * A results-table record whose rating list is the round's own month *is* that
 * round's rating, so a single-month event needs nothing fetched.
 */
export function ratingsToFetch(
	tournament: TournamentDto,
	{ roundResults, snapshot }: PerformanceInputs
): IndividualPerformanceLookup[] {
	return getIndividualPerformanceLookups(tournament, roundResults).filter(
		(lookup) => !coveredBySnapshot(lookup, snapshot)
	);
}

/**
 * A record for every player without one in a results table, at the month of
 * their first game — for the name and club. Most are also fetched as someone's
 * opponent; the cache asks once either way. This catches the rest, such as a
 * player whose only games were walkovers.
 */
export function namesToFetch({ firstGame }: PerformanceInputs): IndividualPerformanceLookup[] {
	return [...firstGame].map(([playerId, roundDate]) => ({ playerId, roundDate }));
}

function coveredBySnapshot(
	{ playerId, roundDate }: IndividualPerformanceLookup,
	snapshot: ReadonlyMap<number, PlayerInfoDto>
): boolean {
	const listDate = snapshot.get(playerId)?.elo?.date;
	if (!listDate) return false;
	const roundMonth = getMonthStartString(normalizeEloLookupDate(parseDateToTimestamp(roundDate)));
	return listDate.slice(0, 10) === roundMonth;
}
