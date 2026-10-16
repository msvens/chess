import { describe, it, expect } from 'vitest';
import {
	getIndividualPerformance,
	PointSystem,
	ResultCode,
	RoundRatedType,
	type PlayerInfoDto,
	type TournamentDto,
	type TournamentRoundResultDto
} from '$lib/api';
import { playerMatches, type PlayerMatch } from '../playerMatches';
import {
	formatEloChange,
	formatPerformance,
	performanceGame,
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

describe('performanceGame', () => {
	const opponent = player({ rating: 1800, rapidRating: 1750, blitzRating: 0 });
	const perf = (m: PlayerMatch, them: PlayerInfoDto | undefined = opponent) =>
		performanceGame(m, them, STANDARD_ALGORITHM);

	it('scores a win, a draw and a loss as 1, ½ and 0', () => {
		expect(perf(match({ result: 'win' }))!.score).toBe(1);
		expect(perf(match({ result: 'draw' }))!.score).toBe(0.5);
		expect(perf(match({ result: 'loss' }))!.score).toBe(0);
	});

	it('rates the opponent at the round’s own type', () => {
		expect(perf(match())!.opponentRating).toBe(1800);
		expect(perf(match({ roundRatedType: RoundRatedType.RAPID }))!.opponentRating).toBe(1750);
	});

	it('needs nothing from the player — an unrated player still counts', () => {
		// The signature takes no player at all; this is the case `ratedGame` cannot do.
		expect(rate(match(), player({ rating: 0 }))).toBeNull();
		expect(perf(match())).not.toBeNull();
	});

	it('leaves out what was not played, or not rated', () => {
		expect(perf(match({ isWalkover: true }))).toBeNull();
		expect(perf(match({ isCountable: false }))).toBeNull();
		expect(perf(match({ resultCode: ResultCode.WHITE_TOURIST_WO }))).toBeNull();
		expect(perf(match({ roundRatedType: RoundRatedType.UNRATED }))).toBeNull();
	});

	it('leaves out an opponent with no rating of the round’s type', () => {
		// Counting them as zero would drag the performance down by hundreds of points.
		expect(perf(match({ roundRatedType: RoundRatedType.BLITZ }))).toBeNull();
		expect(performanceGame(match(), undefined, STANDARD_ALGORITHM)).toBeNull();
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
		expect(summarise(matches, ME, playerAt, STANDARD_ALGORITHM, null).playedCount).toBe(1);
	});

	it('excludes a walkover from the score as well as the count', () => {
		const matches = [match(), match({ round: 2, isWalkover: true })];
		expect(summarise(matches, ME, playerAt, STANDARD_ALGORITHM, null).totalScore).toBe(1);
	});

	it('scores through the result code, so an alternate point system is right', () => {
		// Schack4an pays 3 for a win rather than 1.
		const matches = [match({ resultCode: ResultCode.SCHACK4AN_WHITE_WIN })];
		expect(summarise(matches, ME, playerAt, STANDARD_ALGORITHM, null).totalScore).toBe(3);
	});

	it('puts a win’s worth per played game in the maximum', () => {
		// 11 games at 3/2/1, the shape behind the "31 of 11" report.
		const matches = Array.from({ length: 11 }, (_, i) => match({ round: i + 1 }));
		const at = (system: number | null) =>
			summarise(matches, ME, playerAt, STANDARD_ALGORITHM, system).maxScore;
		expect(at(PointSystem.DEFAULT)).toBe(11);
		expect(at(PointSystem.SCHACK4AN)).toBe(33);
		expect(at(PointSystem.POINT310)).toBe(33);
	});

	it('leaves walkovers out of the maximum, and reads an unknown system as 1/½/0', () => {
		const matches = [match(), match({ round: 2, isWalkover: true })];
		expect(
			summarise(matches, ME, playerAt, STANDARD_ALGORITHM, PointSystem.SCHACK4AN).maxScore
		).toBe(3);
		expect(summarise(matches, ME, playerAt, STANDARD_ALGORITHM, null).maxScore).toBe(1);
		expect(summarise(matches, ME, playerAt, STANDARD_ALGORITHM, 99).maxScore).toBe(1);
	});

	it('falls back to the row’s own points when there is no code', () => {
		const matches = [match({ resultCode: undefined, playerPoints: 0.5 })];
		expect(summarise(matches, ME, playerAt, STANDARD_ALGORITHM, null).totalScore).toBe(0.5);
	});

	it('keeps each rating type in its own bucket', () => {
		// Elo from two different lists must never be added together.
		const matches = [
			match({ round: 1, roundRatedType: RoundRatedType.STANDARD }),
			match({ round: 2, roundRatedType: RoundRatedType.BLITZ }),
			match({ round: 3, roundRatedType: RoundRatedType.BLITZ })
		];
		const summary = summarise(matches, ME, playerAt, STANDARD_ALGORITHM, null);
		expect(summary.byRatingType.standard.gameCount).toBe(1);
		expect(summary.byRatingType.blitz.gameCount).toBe(2);
		expect(summary.ratedTypes).toEqual(['standard', 'blitz']);
	});

	it('names no rated types when nothing was rated', () => {
		const matches = [match({ roundRatedType: RoundRatedType.UNRATED })];
		expect(summarise(matches, ME, playerAt, STANDARD_ALGORITHM, null).ratedTypes).toEqual([]);
	});

	it('counts a played-but-unrated game in the score, not in a bucket', () => {
		const matches = [match({ roundRatedType: RoundRatedType.UNRATED })];
		const summary = summarise(matches, ME, playerAt, STANDARD_ALGORITHM, null);
		expect(summary.playedCount).toBe(1);
		expect(summary.totalScore).toBe(1);
		expect(summary.byRatingType.standard.gameCount).toBe(0);
	});

	it('pools every rated game into one performance, while Elo stays per list', () => {
		const matches = [
			match({ round: 1, roundRatedType: RoundRatedType.RAPID }),
			match({ round: 2, roundRatedType: RoundRatedType.STANDARD }),
			match({ round: 3, roundRatedType: RoundRatedType.STANDARD, result: 'loss' })
		];
		const summary = summarise(matches, ME, playerAt, STANDARD_ALGORITHM, null);
		expect(summary.ratedTypes).toEqual(['standard', 'rapid']);
		expect(summary.performance.opponentRatings).toEqual([1650, 1650, 1650]);
		expect(summary.performance.score).toBe(2);
	});

	it('gives an unrated player a performance but no Elo change', () => {
		const unrated: PlayerAt = (id) =>
			id === ME ? player({ rating: 0, rapidRating: 0, blitzRating: 0 }) : player();
		const summary = summarise([match()], ME, unrated, STANDARD_ALGORITHM, null);
		expect(summary.ratedTypes).toEqual([]);
		expect(summary.performance.opponentRatings).toEqual([1700]);
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
	const stats = (opponentRatings: number[], score: number) => ({ opponentRatings, score });

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

	it('is a dash below three games against rated opponents', () => {
		// The official site shows none below three; two games is not enough.
		expect(formatPerformance(stats([1600, 1700], 2))).toBe('-');
	});

	it('takes a lower minimum where the caller allows one', () => {
		// Head-to-head shows a performance from a single game.
		expect(formatPerformance(stats([1600], 1), 1)).toBe('2400');
		expect(formatPerformance(stats([], 0), 1)).toBe('-');
	});
});

describe('agreeing with the SDK’s performance list', () => {
	// The tournament list (`getIndividualPerformance`) and the match page must show the
	// same number for the same player. One group with every awkward case: an
	// unrated subject, a rapid round in a standard group, an unrated round, a
	// walkover and an opponent with no rating.
	const GROUP = 500;
	const SUBJECT = 1;
	const rounds = [
		{ roundNumber: 1, rated: RoundRatedType.RAPID },
		{ roundNumber: 2, rated: RoundRatedType.STANDARD },
		{ roundNumber: 3, rated: RoundRatedType.STANDARD },
		{ roundNumber: 4, rated: RoundRatedType.UNRATED },
		{ roundNumber: 5, rated: RoundRatedType.STANDARD },
		{ roundNumber: 6, rated: RoundRatedType.STANDARD }
	];
	const tournament = {
		id: 1,
		rootClasses: [
			{
				groups: [
					{
						id: GROUP,
						pointSystem: PointSystem.DEFAULT,
						rankingAlgorithm: STANDARD_ALGORITHM,
						tournamentRounds: rounds
					}
				]
			}
		]
	} as unknown as TournamentDto;

	const row = (roundNr: number, opponent: number, result: number): TournamentRoundResultDto =>
		({
			roundNr,
			date: '2026-01-15',
			homeId: SUBJECT,
			awayId: opponent,
			homeResult: 0,
			awayResult: 0,
			games: [{ whiteId: SUBJECT, blackId: opponent, result }]
		}) as unknown as TournamentRoundResultDto;
	const rows = [
		row(1, 11, ResultCode.WHITE_WIN),
		row(2, 12, ResultCode.DRAW),
		row(3, 13, ResultCode.BLACK_WIN),
		row(4, 14, ResultCode.WHITE_WIN),
		row(5, 15, ResultCode.WHITE_WIN_WO),
		row(6, 16, ResultCode.WHITE_WIN)
	];

	const records: Record<number, PlayerInfoDto['elo'] | undefined> = {
		[SUBJECT]: undefined,
		11: { rating: 1900, rapidRating: 1850 } as PlayerInfoDto['elo'],
		12: { rating: 1700 } as PlayerInfoDto['elo'],
		13: { rating: 2000 } as PlayerInfoDto['elo'],
		14: { rating: 1500 } as PlayerInfoDto['elo'],
		15: { rating: 1600 } as PlayerInfoDto['elo'],
		16: { rating: 0 } as PlayerInfoDto['elo']
	};
	const record = (id: number) => ({ ...player(), id, elo: records[id] }) as PlayerInfoDto;

	it('gives the subject the same performance as the list', () => {
		const listed = getIndividualPerformance(tournament, new Map([[GROUP, rows]]), (id) =>
			record(id)
		).find((r) => r.playerId === SUBJECT);

		const matches = playerMatches({
			memberId: SUBJECT,
			isTeamTournament: false,
			individualRoundResults: rows,
			teamRoundResults: [],
			ratedTypeOfRound: (round) => rounds.find((r) => r.roundNumber === round)?.rated
		});
		const summary = summarise(matches, SUBJECT, record, STANDARD_ALGORITHM, null);

		// Rounds 1 (rapid 1850), 2 and 3 count: round 4 is unrated, 5 a walkover,
		// 6 an unrated opponent.
		expect(listed?.ratedGames).toBe(3);
		expect(summary.performance.opponentRatings).toEqual([1850, 1700, 2000]);
		expect(formatPerformance(summary.performance)).toBe(String(listed?.performance));
	});
});
