/**
 * The tournament-wide performance list: whether a tournament has one, and the
 * inputs and rating lookups the SDK's `getIndividualPerformance` needs.
 *
 * Pure, so the request-saving rule — which ratings the results tables already
 * answer — is tested without a store or a network.
 */
import {
	getIndividualPerformanceLookups,
	getMonthStartString,
	normalizeEloLookupDate,
	PointSystem,
	type IndividualPerformanceLookup,
	type PlayerInfoDto,
	type TournamentDto,
	type TournamentRoundResultDto
} from '$lib/api';
import { groupKindOf, type PrintGroupData } from '$lib/print/printData';
import { flattenClasses } from './classTree';
import { parseDateToTimestamp } from './roundGrouping';

/**
 * Individual tournaments with at least one group the list covers.
 *
 * Team tournaments are left out for now: their results tables carry no player
 * records, so every rating would be its own request. Schackfyran groups are
 * left out by the official list itself, so a tournament of only those has none.
 */
export function hasIndividualPerformance(tournament: TournamentDto | null | undefined): boolean {
	if (!tournament || groupKindOf(tournament.type) !== 'individual') return false;
	return flattenClasses(tournament).some((cls) =>
		(cls.groups ?? []).some((group) => group.pointSystem !== PointSystem.SCHACK4AN)
	);
}

/** What the list is built from: each group's rounds, and every player's results-table record. */
export interface PerformanceInputs {
	roundResults: Map<number, TournamentRoundResultDto[]>;
	/**
	 * Each player as their group's results table has them — one rating list,
	 * dated by `elo.date`.
	 */
	snapshot: Map<number, PlayerInfoDto>;
}

/** Individual groups only; team groups' tables carry no player records. */
export function performanceInputs(groups: readonly PrintGroupData[]): PerformanceInputs {
	const individual = groups.filter((group) => group.kind === 'individual');
	const snapshot = new Map<number, PlayerInfoDto>();
	for (const group of individual) {
		for (const [id, player] of group.playerMap) snapshot.set(id, player);
	}
	return {
		roundResults: new Map(individual.map((group) => [group.group.id, group.roundResults])),
		snapshot
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

function coveredBySnapshot(
	{ playerId, roundDate }: IndividualPerformanceLookup,
	snapshot: ReadonlyMap<number, PlayerInfoDto>
): boolean {
	const listDate = snapshot.get(playerId)?.elo?.date;
	if (!listDate) return false;
	const roundMonth = getMonthStartString(normalizeEloLookupDate(parseDateToTimestamp(roundDate)));
	return listDate.slice(0, 10) === roundMonth;
}
