/**
 * What a player's games in one group did to their rating.
 *
 * Ports two copies of the same arithmetic from `[memberId]/page.tsx`: the
 * per-game Elo column and the summary panel below the table each walked the
 * matches and recomputed ratings, K-factors and changes independently. Here the
 * column and the summary share `ratedGame`, so they cannot disagree.
 *
 * A tournament can be rated under more than one time control — a blitz chain
 * inside a standard event — and Elo from different lists must never be added
 * together. Hence a bucket per rating type rather than one running total.
 */
import {
	calculateRatingChange,
	calculatePerformanceRating,
	getKFactorForRating,
	getPlayerPoints,
	getPlayerRatingByRoundType,
	getPlayerRatingStrict,
	RoundRatedType,
	type PlayerInfoDto,
	type PlayerRating
} from '$lib/api';
import type { PlayerMatch } from './playerMatches';

/**
 * The rating lists a game can be scored against.
 *
 * Deliberately not the SDK's full `TimeControlType`, which also has `'lask'`.
 * A LASK rating lives on `player.lask`, not on `player.elo`, so
 * `getPlayerRatingStrict(elo, RatingAlgorithm.LASK)` answers with a null rating
 * *and* a null type — a LASK-ranked group therefore produces no rated games at
 * all, and a `lask` bucket here would never be filled. A round's own `rated`
 * type can only ever be standard, rapid or blitz.
 */
export type RatingType = 'standard' | 'rapid' | 'blitz';

/** One game that counted towards a rating. */
export interface RatedGame {
	ratingType: RatingType;
	/** Signed, already rounded to a tenth by the SDK. */
	change: number;
	opponentRating: number;
	/** 1, ½ or 0. */
	score: number;
}

export interface RatingTypeStats {
	change: number;
	opponentRatings: number[];
	score: number;
	gameCount: number;
}

export interface TournamentSummary {
	/** Points scored, in the event's own point system. */
	totalScore: number;
	/** Games that were actually played — walkovers and non-results excluded. */
	playedCount: number;
	byRatingType: Record<RatingType, RatingTypeStats>;
	/** The rating types this event actually produced games for. */
	ratedTypes: RatingType[];
}

/** Look a player's record up as it stood in a given month. */
export type PlayerAt = (playerId: number, date: number) => PlayerInfoDto | undefined;

/**
 * Which rating the two sides bring to a game.
 *
 * The round's own `rated` type wins where it has one, so a blitz round inside a
 * standard event is computed against blitz ratings. `rated === 0` means the
 * round was unrated and falls back to the group's algorithm.
 */
export function matchRatings(
	match: PlayerMatch,
	playerElo: PlayerInfoDto['elo'] | undefined,
	opponentElo: PlayerInfoDto['elo'] | undefined,
	rankingAlgorithm: number | null
): { playerRating: number | null; opponentRating: number | null; ratingType: RatingType | null } {
	const byRound =
		match.roundRatedType !== undefined && match.roundRatedType !== RoundRatedType.UNRATED;

	const player = byRound
		? getPlayerRatingByRoundType(playerElo, match.roundRatedType)
		: getPlayerRatingStrict(playerElo, rankingAlgorithm);
	const opponent = byRound
		? getPlayerRatingByRoundType(opponentElo, match.roundRatedType)
		: getPlayerRatingStrict(opponentElo, rankingAlgorithm);

	return {
		playerRating: player.rating,
		opponentRating: opponent.rating,
		ratingType: eloRatingType(player.ratingType)
	};
}

/**
 * The rating consequence of one game, or null when there is none.
 *
 * Null covers every reason a game does not move a rating: it was a walkover, the
 * code is not a result at all, the round was unrated, or either side has no
 * rating of the relevant type. A missing rating means the game is *excluded*,
 * not that it counts as zero — averaging a zero in would drag a performance
 * rating down by hundreds of points.
 */
export function ratedGame(
	match: PlayerMatch,
	player: PlayerInfoDto | undefined,
	opponent: PlayerInfoDto | undefined,
	rankingAlgorithm: number | null
): RatedGame | null {
	if (match.isWalkover || !match.isCountable) return null;
	if (match.roundRatedType === RoundRatedType.UNRATED) return null;
	if (!player) return null;

	const { playerRating, opponentRating, ratingType } = matchRatings(
		match,
		player.elo,
		opponent?.elo,
		rankingAlgorithm
	);
	if (!playerRating || !opponentRating || !ratingType) return null;

	const score = match.result === 'win' ? 1 : match.result === 'draw' ? 0.5 : 0;
	// The K-factor depends on the player's age *at the time of the round*, not
	// today — juniors under 18 rated below 2300 get K=40.
	const kFactor = getKFactorForRating(
		ratingType,
		playerRating,
		player.elo,
		player.birthdate,
		match.roundDate
	);

	return {
		ratingType,
		change: calculateRatingChange(playerRating, opponentRating, score, kFactor),
		opponentRating,
		score
	};
}

const emptyStats = (): RatingTypeStats => ({
	change: 0,
	opponentRatings: [],
	score: 0,
	gameCount: 0
});

/** Totals for the panel under the games table. */
export function summarise(
	matches: readonly PlayerMatch[],
	memberId: number,
	playerAt: PlayerAt,
	rankingAlgorithm: number | null
): TournamentSummary {
	const byRatingType: Record<RatingType, RatingTypeStats> = {
		standard: emptyStats(),
		rapid: emptyStats(),
		blitz: emptyStats()
	};

	const played = matches.filter((match) => !match.isWalkover && match.isCountable);

	let totalScore = 0;
	for (const match of played) {
		totalScore += pointsOf(match);

		const rated = ratedGame(
			match,
			playerAt(memberId, match.roundDate),
			playerAt(match.opponentId, match.roundDate),
			rankingAlgorithm
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

	return { totalScore, playedCount: played.length, byRatingType, ratedTypes };
}

function eloRatingType(type: PlayerRating['ratingType']): RatingType | null {
	return type === 'standard' || type === 'rapid' || type === 'blitz' ? type : null;
}

/**
 * Points from this game, in whatever system the event uses.
 *
 * The result code is authoritative because it knows the system — Schackfyran
 * pays 3-2-1, not 1-½-0. The row's own points are the fallback for older rows
 * that carry no code.
 */
function pointsOf(match: PlayerMatch): number {
	if (match.resultCode === undefined) return match.playerPoints;
	return getPlayerPoints(match.resultCode, match.color === 'white') ?? 0;
}

/** Signed total, e.g. "+3.4". A dash when nothing was rated. */
export function formatEloChange(stats: RatingTypeStats): string {
	if (stats.gameCount === 0) return '-';
	const rounded = Math.round(stats.change * 10) / 10;
	return rounded > 0 ? `+${rounded}` : String(rounded);
}

/** Performance rating for a bucket. A dash when nothing was rated. */
export function formatPerformance(stats: RatingTypeStats): string {
	if (stats.opponentRatings.length === 0) return '-';
	return String(calculatePerformanceRating(stats.opponentRatings, stats.score));
}
