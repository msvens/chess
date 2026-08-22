import { describe, it, expect } from 'vitest';
import { ResultCode, RoundRatedType, type PlayerInfoDto } from '$lib/api';
import type { PlayerMatch } from '../playerMatches';
import {
	formatEloChange,
	formatPerformance,
	ratedGame,
	summarise,
	type PlayerAt
} from '../tournamentElo';

const ME = 42;
const STANDARD_ALGORITHM = 1;

const player = (
	over: Partial<PlayerInfoDto['elo']> = {},
	birthdate = '1980-01-01'
): PlayerInfoDto =>
	({
		id: ME,
		firstName: 'A',
		lastName: 'B',
		birthdate,
		elo: { rating: 1700, rapidRating: 1650, blitzRating: 1600, title: '', ...over }
	}) as PlayerInfoDto;

const match = (over: Partial<PlayerMatch> = {}): PlayerMatch => ({
	round: 1,
	roundDate: Date.parse('2026-01-15'),
	opponentId: 99,
	result: 'win',
	color: 'white',
	playerPoints: 1,
	opponentPoints: 0,
	isWalkover: false,
	isCountable: true,
	resultCode: ResultCode.WHITE_WIN,
	roundRatedType: RoundRatedType.STANDARD,
	...over
});

const rate = (m: PlayerMatch, me = player(), them = player({ rating: 1650 })) =>
	ratedGame(m, me, them, STANDARD_ALGORITHM);

describe('ratedGame — when a game does not touch a rating', () => {
	it('a walkover does not', () => {
		expect(rate(match({ isWalkover: true }))).toBeNull();
	});

	it('a code that is not a result does not', () => {
		expect(rate(match({ isCountable: false }))).toBeNull();
	});

	it('an unrated round does not', () => {
		expect(rate(match({ roundRatedType: RoundRatedType.UNRATED }))).toBeNull();
	});

	it('a player with no record does not', () => {
		expect(ratedGame(match(), undefined, player(), STANDARD_ALGORITHM)).toBeNull();
	});

	it('an unrated opponent does not', () => {
		// Excluded, not counted as zero — averaging a zero in would drag the
		// performance rating down by hundreds of points.
		expect(rate(match(), player(), player({ rating: 0 }))).toBeNull();
		expect(ratedGame(match(), player(), undefined, STANDARD_ALGORITHM)).toBeNull();
	});

	it('an unrated player does not', () => {
		expect(rate(match(), player({ rating: 0 }))).toBeNull();
	});
});

describe('ratedGame — the arithmetic', () => {
	it('gains rating for beating a higher-rated opponent, and more than for a lower one', () => {
		const overdog = rate(match(), player({ rating: 1700 }), player({ rating: 1500 }))!;
		const underdog = rate(match(), player({ rating: 1700 }), player({ rating: 1900 }))!;
		expect(underdog.change).toBeGreaterThan(overdog.change);
		expect(overdog.change).toBeGreaterThan(0);
	});

	it('loses rating for losing', () => {
		expect(rate(match({ result: 'loss' }))!.change).toBeLessThan(0);
	});

	it('scores a win, a draw and a loss as 1, ½ and 0', () => {
		expect(rate(match({ result: 'win' }))!.score).toBe(1);
		expect(rate(match({ result: 'draw' }))!.score).toBe(0.5);
		expect(rate(match({ result: 'loss' }))!.score).toBe(0);
	});

	it('uses the round’s own rating type over the group algorithm', () => {
		// The player is 1700 standard but 1600 blitz. A blitz-rated round inside a
		// standard event must be computed against the blitz figure.
		const blitz = rate(match({ roundRatedType: RoundRatedType.BLITZ }))!;
		expect(blitz.ratingType).toBe('blitz');

		const standard = rate(match({ roundRatedType: RoundRatedType.STANDARD }))!;
		expect(standard.ratingType).toBe('standard');
	});

	it('falls back to the group algorithm when the round names no type', () => {
		expect(rate(match({ roundRatedType: undefined }))!.ratingType).toBe('standard');
	});

	it('gives a junior the larger K-factor, judged at the round’s date', () => {
		// Under 18 and below 2300 is K=40, so the same result moves further.
		const born = '2015-06-01';
		const junior = rate(match(), player({ rating: 1700 }, born), player({ rating: 1650 }))!;
		const adult = rate(match(), player({ rating: 1700 }), player({ rating: 1650 }))!;
		expect(Math.abs(junior.change)).toBeGreaterThan(Math.abs(adult.change));
	});
});

describe('summarise', () => {
	const playerAt: PlayerAt = (id) =>
		id === ME ? player() : player({ rating: 1650, rapidRating: 1650, blitzRating: 1650 });

	it('counts only games that were played', () => {
		const matches = [
			match(),
			match({ round: 2, isWalkover: true }),
			match({ round: 3, isCountable: false })
		];
		expect(summarise(matches, ME, playerAt, STANDARD_ALGORITHM).playedCount).toBe(1);
	});

	it('excludes a walkover from the score as well as the count', () => {
		const matches = [match(), match({ round: 2, isWalkover: true })];
		expect(summarise(matches, ME, playerAt, STANDARD_ALGORITHM).totalScore).toBe(1);
	});

	it('scores through the result code, so an alternate point system is right', () => {
		// Schack4an pays 3 for a win rather than 1.
		const matches = [match({ resultCode: ResultCode.SCHACK4AN_WHITE_WIN })];
		expect(summarise(matches, ME, playerAt, STANDARD_ALGORITHM).totalScore).toBe(3);
	});

	it('falls back to the row’s own points when there is no code', () => {
		const matches = [match({ resultCode: undefined, playerPoints: 0.5 })];
		expect(summarise(matches, ME, playerAt, STANDARD_ALGORITHM).totalScore).toBe(0.5);
	});

	it('keeps each rating type in its own bucket', () => {
		// Elo from two different lists must never be added together.
		const matches = [
			match({ round: 1, roundRatedType: RoundRatedType.STANDARD }),
			match({ round: 2, roundRatedType: RoundRatedType.BLITZ }),
			match({ round: 3, roundRatedType: RoundRatedType.BLITZ })
		];
		const summary = summarise(matches, ME, playerAt, STANDARD_ALGORITHM);
		expect(summary.byRatingType.standard.gameCount).toBe(1);
		expect(summary.byRatingType.blitz.gameCount).toBe(2);
		expect(summary.ratedTypes).toEqual(['standard', 'blitz']);
	});

	it('names no rated types when nothing was rated', () => {
		const matches = [match({ roundRatedType: RoundRatedType.UNRATED })];
		expect(summarise(matches, ME, playerAt, STANDARD_ALGORITHM).ratedTypes).toEqual([]);
	});

	it('counts a played-but-unrated game in the score, not in a bucket', () => {
		const matches = [match({ roundRatedType: RoundRatedType.UNRATED })];
		const summary = summarise(matches, ME, playerAt, STANDARD_ALGORITHM);
		expect(summary.playedCount).toBe(1);
		expect(summary.totalScore).toBe(1);
		expect(summary.byRatingType.standard.gameCount).toBe(0);
	});
});

describe('formatEloChange', () => {
	const stats = (over: Partial<{ change: number; gameCount: number }> = {}) => ({
		change: 3.44,
		opponentRatings: [1600],
		score: 1,
		gameCount: 1,
		...over
	});

	it('signs a gain and rounds to a tenth', () => {
		expect(formatEloChange(stats())).toBe('+3.4');
	});

	it('signs a loss', () => {
		expect(formatEloChange(stats({ change: -1.24 }))).toBe('-1.2');
	});

	it('is a dash when nothing was rated', () => {
		expect(formatEloChange(stats({ gameCount: 0 }))).toBe('-');
	});
});

describe('formatPerformance', () => {
	const stats = (opponentRatings: number[], score: number) => ({
		change: 0,
		opponentRatings,
		score,
		gameCount: opponentRatings.length
	});

	it('is 800 above the field for a perfect score', () => {
		expect(formatPerformance(stats([1600, 1700, 1800], 3))).toBe('2500');
	});

	it('is 800 below the field for no score at all', () => {
		expect(formatPerformance(stats([1600, 1700, 1800], 0))).toBe('900');
	});

	it('is the field average for an even score', () => {
		expect(formatPerformance(stats([1600, 1700, 1800], 1.5))).toBe('1700');
	});

	it('is a dash when nothing was rated', () => {
		expect(formatPerformance(stats([], 0))).toBe('-');
	});
});
