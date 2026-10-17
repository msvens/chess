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
 * together. Hence a bucket per rating type for the Elo change. Performance is
 * the other way round: one per player per event, pooling every rated game at
 * its own round's type, as the official site and the SDK's
 * `getIndividualPerformance` do.
 */
import {
	calculateRatingChange,
	calculatePerformanceRating,
	getGroupTimeControl,
	getKFactorForRating,
	getPlayerPoints,
	getPlayerRatingForRound,
	isTouristBye,
	MIN_RATED_GAMES_FOR_PERFORMANCE,
	PointSystem,
	PointValues,
	RoundRatedType,
	type PlayerInfoDto,
	type PlayerRating,
	type TournamentClassGroupDto
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

/** One game that moved the player's rating. */
export interface RatedGame {
	ratingType: RatingType;
	/** Signed, already rounded to a tenth by the SDK. */
	change: number;
}

/** One game that counts towards a performance rating. */
export interface PerformanceGame {
	opponentRating: number;
	/** 1, ½ or 0. */
	score: number;
}

/** Elo change for one rating list. */
export interface RatingTypeStats {
	change: number;
	gameCount: number;
}

/** The games behind a performance rating, pooled across rating types. */
export interface PerformanceStats {
	opponentRatings: number[];
	score: number;
}

export interface TournamentSummary {
	/** Points scored, in the event's own point system. */
	totalScore: number;
	/** Games that were actually played — walkovers and non-results excluded. */
	playedCount: number;
	/** The most `playedCount` games could score: a win's worth each, in the event's point system. */
	maxScore: number;
	byRatingType: Record<RatingType, RatingTypeStats>;
	/** The rating types this event moved the player's rating on. */
	ratedTypes: RatingType[];
	performance: PerformanceStats;
}

/** Look a player's record up as it stood in a given month. */
export type PlayerAt = (playerId: number, date: number) => PlayerInfoDto | undefined;

/**
 * Which rating the two sides bring to a game.
 *
 * The rule is the SDK's `getPlayerRatingForRound`: the round's own `rated` type
 * wins where it has one, so a blitz round inside a standard event is computed
 * against blitz ratings; an unrated or unknown round falls back to the group's
 * algorithm.
 */
export function matchRatings(
	match: PlayerMatch,
	playerElo: PlayerInfoDto['elo'] | undefined,
	opponentElo: PlayerInfoDto['elo'] | undefined,
	rankingAlgorithm: number | null
): { playerRating: number | null; opponentRating: number | null; ratingType: RatingType | null } {
	const player = getPlayerRatingForRound(playerElo, rankingAlgorithm, match.roundRatedType);
	const opponent = getPlayerRatingForRound(opponentElo, rankingAlgorithm, match.roundRatedType);

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
 * rating of the relevant type — the change needs both ratings and the player's
 * K-factor.
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

	const score = scoreOf(match);
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
		change: calculateRatingChange(playerRating, opponentRating, score, kFactor)
	};
}

/**
 * What one game adds to a performance rating, or null when it adds nothing.
 *
 * Only the opponent's rating matters — an unrated player still gets a
 * performance. The game must have been played (no walkover or tourist bye, a
 * real result), in a rated round, against an opponent rated at that round's
 * type. A missing rating *excludes* the game rather than counting as zero, which
 * would drag the performance down by hundreds of points. These are the SDK's
 * `getIndividualPerformance` rules, so this page and that list agree.
 */
export function performanceGame(
	match: PlayerMatch,
	opponent: PlayerInfoDto | undefined,
	rankingAlgorithm: number | null
): PerformanceGame | null {
	if (match.isWalkover || !match.isCountable) return null;
	if (match.resultCode !== undefined && isTouristBye(match.resultCode)) return null;
	if (match.roundRatedType === RoundRatedType.UNRATED) return null;

	const { rating } = getPlayerRatingForRound(opponent?.elo, rankingAlgorithm, match.roundRatedType);
	if (!rating) return null;

	return { opponentRating: rating, score: scoreOf(match) };
}

const scoreOf = (match: PlayerMatch): number =>
	match.result === 'win' ? 1 : match.result === 'draw' ? 0.5 : 0;

const emptyStats = (): RatingTypeStats => ({ change: 0, gameCount: 0 });

/** Totals for the panel under the games table. */
export function summarise(
	matches: readonly PlayerMatch[],
	memberId: number,
	playerAt: PlayerAt,
	rankingAlgorithm: number | null,
	pointSystem: number | null
): TournamentSummary {
	const byRatingType: Record<RatingType, RatingTypeStats> = {
		standard: emptyStats(),
		rapid: emptyStats(),
		blitz: emptyStats()
	};

	const performance: PerformanceStats = { opponentRatings: [], score: 0 };

	const played = matches.filter((match) => !match.isWalkover && match.isCountable);

	let totalScore = 0;
	for (const match of played) {
		totalScore += pointsOf(match);
		const opponent = playerAt(match.opponentId, match.roundDate);

		const forPerformance = performanceGame(match, opponent, rankingAlgorithm);
		if (forPerformance) {
			performance.opponentRatings.push(forPerformance.opponentRating);
			performance.score += forPerformance.score;
		}

		const rated = ratedGame(match, playerAt(memberId, match.roundDate), opponent, rankingAlgorithm);
		if (!rated) continue;

		const stats = byRatingType[rated.ratingType];
		stats.change += rated.change;
		stats.gameCount += 1;
	}

	const ratedTypes = (Object.keys(byRatingType) as RatingType[]).filter(
		(type) => byRatingType[type].gameCount > 0
	);

	return {
		totalScore,
		playedCount: played.length,
		maxScore: played.length * winValue(pointSystem),
		byRatingType,
		ratedTypes,
		performance
	};
}

/** Points for a win in a group's point system; 1/½/0 when it is missing or unrecognised. */
function winValue(pointSystem: number | null): number {
	const system =
		pointSystem === PointSystem.SCHACK4AN || pointSystem === PointSystem.POINT310
			? pointSystem
			: PointSystem.DEFAULT;
	return PointValues[system].win;
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

/**
 * The performance rating, or a dash with fewer than `minGames` games against
 * rated opponents. The default is `MIN_RATED_GAMES_FOR_PERFORMANCE` — the
 * official site shows none below that for a tournament.
 */
export function formatPerformance(
	stats: PerformanceStats,
	minGames: number = MIN_RATED_GAMES_FOR_PERFORMANCE
): string {
	if (stats.opponentRatings.length < minGames) return '-';
	return String(calculatePerformanceRating(stats.opponentRatings, stats.score));
}

/**
 * Whether a group's games can give a performance at all: rated, and not
 * Schackfyran scoring. The SDK's `hasIndividualPerformance` rule, for one group.
 */
export function isEloGroup(group: TournamentClassGroupDto): boolean {
	return (
		group.pointSystem !== PointSystem.SCHACK4AN && getGroupTimeControl(group).primary !== 'unknown'
	);
}

/**
 * A performance from as few as one rated game, for a view of one player
 * (head-to-head, their own tournament page). Below
 * `MIN_RATED_GAMES_FOR_PERFORMANCE` it says how few games it rests on, since
 * one win alone reads as the opponent's rating + 800. The tournament list keeps
 * the minimum, as the official one does.
 */
export function formatPerformanceWithCount(
	stats: PerformanceStats,
	labels: { oneGame: string; games: string }
): string {
	const value = formatPerformance(stats, 1);
	const rated = stats.opponentRatings.length;
	if (rated === 0 || rated >= MIN_RATED_GAMES_FOR_PERFORMANCE) return value;
	const games = rated === 1 ? labels.oneGame : labels.games.replace('{count}', String(rated));
	return `${value} (${games})`;
}
