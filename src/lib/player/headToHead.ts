/**
 * One player's record against one opponent.
 *
 * Ports the two big loops of `components/player/HeadToHeadTab.tsx` — the
 * per-game Elo column and the summary panel below it — which walked the same
 * games twice with slightly different guards and recomputed everything
 * independently.
 *
 * The arithmetic itself is not reimplemented: `results/tournamentElo.ts` already
 * has it, tested, from the results drill-down. What lives here is the part that
 * is genuinely different — a head-to-head spans *many* tournaments, so the
 * ranking algorithm and the rating date change from game to game, where the
 * drill-down has one of each for the whole group.
 */
import {
	calculatePlayerResult,
	findTournamentGroup,
	isCountableResult,
	isWalkoverResultCode,
	normalizeEloLookupDate,
	parseLocalDate,
	type GameDto,
	type PlayerInfoDto,
	type TournamentDto
} from '$lib/api';
import type { PlayerMatch } from '$lib/results/playerMatches';
import { ratedGame, type RatingType, type RatingTypeStats } from '$lib/results/tournamentElo';

/** What a group contributes to a rating: when it counted, and against which list. */
export interface GroupMeta {
	/** Unix ms, normalised to the first of the month the ratings were read from. */
	date: number;
	rankingAlgorithm: number;
}

/** Look a player's record up as it stood in a given month. */
export type PlayerAt = (playerId: number, date: number) => PlayerInfoDto | undefined;

export interface HeadToHeadSummary {
	/** Points, counted 1/½/0 — see `summarise` below for why not the point system. */
	totalScore: number;
	playedCount: number;
	byRatingType: Record<RatingType, RatingTypeStats>;
	/** The rating lists these games actually moved. */
	ratedTypes: RatingType[];
}

/** Just the games these two played against each other. */
export function headToHeadGames(
	games: readonly GameDto[],
	memberId: number,
	opponentId: number
): GameDto[] {
	return games.filter(
		(game) =>
			(game.whiteId === memberId && game.blackId === opponentId) ||
			(game.blackId === memberId && game.whiteId === opponentId)
	);
}

/**
 * Rating date and algorithm per group.
 *
 * The date is the group's start, falling back to the tournament's — games carry
 * no date of their own. Normalised to a month because that is the granularity
 * SSF publishes ratings at.
 */
export function groupMetaFor(
	games: readonly GameDto[],
	tournamentOf: (groupId: number) => TournamentDto | undefined
): Map<number, GroupMeta> {
	const meta = new Map<number, GroupMeta>();

	for (const game of games) {
		if (meta.has(game.groupiD)) continue;

		const tournament = tournamentOf(game.groupiD);
		if (!tournament) continue;
		const found = findTournamentGroup(tournament, game.groupiD);
		if (!found) continue;

		const when = parseLocalDate(found.group.start || tournament.start).getTime();
		if (Number.isNaN(when)) continue;

		meta.set(game.groupiD, {
			date: normalizeEloLookupDate(when),
			rankingAlgorithm: found.group.rankingAlgorithm
		});
	}

	return meta;
}

/** Every (player, month) pair these games need a historical rating for. */
export function ratingRequests(
	meta: ReadonlyMap<number, GroupMeta>,
	memberId: number,
	opponentId: number
): { playerId: number; date: number }[] {
	const seen = new Set<string>();
	const requests: { playerId: number; date: number }[] = [];

	for (const { date } of meta.values()) {
		for (const playerId of [memberId, opponentId]) {
			const key = `${playerId}-${date}`;
			if (seen.has(key)) continue;
			seen.add(key);
			requests.push({ playerId, date });
		}
	}

	return requests;
}

/**
 * A game in the shape `tournamentElo` speaks.
 *
 * Head-to-head has no rounds, so `roundRatedType` is left unset — which is
 * exactly what makes `matchRatings` fall back to the group's ranking algorithm,
 * the behaviour this page wants. The fields the Elo maths does not read are
 * filled in honestly rather than faked, since a wrong-looking zero is worse than
 * a right-looking one.
 */
function asMatch(game: GameDto, memberId: number, date: number): PlayerMatch | null {
	const outcome = calculatePlayerResult(game, memberId);
	if (outcome === null) return null;

	const isWhite = game.whiteId === memberId;

	return {
		round: 0,
		roundDate: date,
		opponentId: isWhite ? game.blackId : game.whiteId,
		result: outcome,
		color: isWhite ? 'white' : 'black',
		playerPoints: outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0,
		opponentPoints: outcome === 'win' ? 0 : outcome === 'draw' ? 0.5 : 1,
		isWalkover: isWalkoverResultCode(game.result),
		isCountable: isCountableResult(game.result),
		resultCode: game.result
	};
}

/**
 * Whether a game can move a rating at all.
 *
 * A negative id is a bye or a walkover slot rather than a person, and there is
 * no rating on the other side to compute against.
 */
function isPlayable(game: GameDto): boolean {
	if (!isCountableResult(game.result) || isWalkoverResultCode(game.result)) return false;
	return game.whiteId >= 0 && game.blackId >= 0;
}

/** Elo change per game id, for the column beside each row. */
export function eloChanges(
	games: readonly GameDto[],
	memberId: number,
	opponentId: number,
	meta: ReadonlyMap<number, GroupMeta>,
	playerAt: PlayerAt
): Map<number, number> {
	const changes = new Map<number, number>();

	for (const game of games) {
		if (!isPlayable(game)) continue;

		const groupMeta = meta.get(game.groupiD);
		if (!groupMeta) continue;

		const match = asMatch(game, memberId, groupMeta.date);
		if (!match) continue;

		const rated = ratedGame(
			match,
			playerAt(memberId, groupMeta.date),
			playerAt(opponentId, groupMeta.date),
			groupMeta.rankingAlgorithm
		);
		if (rated) changes.set(game.id, rated.change);
	}

	return changes;
}

const emptyStats = (): RatingTypeStats => ({
	change: 0,
	opponentRatings: [],
	score: 0,
	gameCount: 0
});

/**
 * Totals for the panel under the table.
 *
 * Score is counted 1/½/0 rather than in the event's own point system — unlike
 * the tournament summary, which honours Schackfyran's 3-2-1. Deliberate: these
 * games span many events, and adding a Schackfyran 3 to an ordinary 1 would
 * produce a number that means nothing.
 *
 * A game counts towards "x of y" even when its tournament metadata is missing;
 * only the Elo buckets need a rating to fall into. That is the React version's
 * behaviour, and it is the right one — the game was still played.
 */
export function summarise(
	games: readonly GameDto[],
	memberId: number,
	opponentId: number,
	meta: ReadonlyMap<number, GroupMeta>,
	playerAt: PlayerAt
): HeadToHeadSummary {
	const byRatingType: Record<RatingType, RatingTypeStats> = {
		standard: emptyStats(),
		rapid: emptyStats(),
		blitz: emptyStats()
	};

	let totalScore = 0;
	let playedCount = 0;

	for (const game of games) {
		if (!isPlayable(game)) continue;

		const groupMeta = meta.get(game.groupiD);
		const match = asMatch(game, memberId, groupMeta?.date ?? Number.NaN);
		if (!match) continue;

		totalScore += match.playerPoints;
		playedCount += 1;

		if (!groupMeta) continue;

		const rated = ratedGame(
			match,
			playerAt(memberId, groupMeta.date),
			playerAt(opponentId, groupMeta.date),
			groupMeta.rankingAlgorithm
		);
		if (!rated) continue;

		const stats = byRatingType[rated.ratingType];
		stats.change += rated.change;
		stats.opponentRatings.push(rated.opponentRating);
		stats.score += rated.score;
		stats.gameCount += 1;
	}

	const ratedTypes = (Object.keys(byRatingType) as RatingType[]).filter(
		(type) => byRatingType[type].gameCount > 0
	);

	return { totalScore, playedCount, byRatingType, ratedTypes };
}
