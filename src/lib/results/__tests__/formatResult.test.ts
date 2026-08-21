import { describe, it, expect } from 'vitest';
import { ResultCode } from '@msvens/schack-se-sdk';
import {
	formatBoardResult,
	formatResult,
	formatResultCode,
	formatIndividualRowResult,
	formatScore,
	formatTeamMatchScore,
	type ResultLabels
} from '../formatResult';
import type { BoardGame } from '../teamMatches';

const sv: ResultLabels = {
	postponed: 'Uppskjutet',
	adjudicated: 'domslut',
	bye: 'Frirond',
	noResult: '-'
};

/** Minimal individually-paired row: one game, plus the row's points. */
const row = (result: number | undefined, homeResult = 0, awayResult = 0) => ({
	homeResult,
	awayResult,
	games: result === undefined ? [] : [{ result } as never]
});

describe('formatScore', () => {
	it('renders half points as ½ and leaves the rest alone', () => {
		expect(formatScore(0.5)).toBe('½');
		expect(formatScore(0)).toBe('0');
		expect(formatScore(1)).toBe('1');
		expect(formatScore(3)).toBe('3');
	});
});

describe('formatResultCode — standard point system', () => {
	it('renders decisive games and draws', () => {
		expect(formatResultCode(ResultCode.WHITE_WIN, sv)).toBe('1 - 0');
		expect(formatResultCode(ResultCode.BLACK_WIN, sv)).toBe('0 - 1');
		expect(formatResultCode(ResultCode.DRAW, sv)).toBe('½ - ½');
	});

	it('suffixes walkovers with the untranslated w.o', () => {
		expect(formatResultCode(ResultCode.WHITE_WIN_WO, sv)).toBe('1 - 0 w.o');
		expect(formatResultCode(ResultCode.BLACK_WIN_WO, sv)).toBe('0 - 1 w.o');
	});

	it('renders the 0-0 double forfeit rather than swallowing it', () => {
		// The bug this work fixes: NO_WIN_WO used to render as a bare "-".
		expect(formatResultCode(ResultCode.NO_WIN_WO, sv)).toBe('0 - 0 w.o');
	});

	it('translates adjudicated results', () => {
		expect(formatResultCode(ResultCode.BOTH_NO_RESULT, sv)).toBe('0 - 0 domslut');
		expect(formatResultCode(ResultCode.BOTH_WIN, sv)).toBe('1 - 1 domslut');
	});

	it('translates postponed and shows no score', () => {
		expect(formatResultCode(ResultCode.POSTPONED, sv)).toBe('Uppskjutet');
	});

	it('renders a tourist bye one-sided', () => {
		expect(formatResultCode(ResultCode.WHITE_TOURIST_WO, sv)).toBe('½ Frirond');
	});

	it('renders NOT_SET and unknown codes as no result', () => {
		expect(formatResultCode(ResultCode.NOT_SET, sv)).toBe('-');
		expect(formatResultCode(9999, sv)).toBe('-');
	});
});

describe('formatResultCode — alternate point systems', () => {
	it('renders Schackfyran scores in its own 3-2-1 values', () => {
		expect(formatResultCode(ResultCode.SCHACK4AN_WHITE_WIN, sv)).toBe('3 - 1');
		expect(formatResultCode(ResultCode.SCHACK4AN_BLACK_WIN, sv)).toBe('1 - 3');
		expect(formatResultCode(ResultCode.SCHACK4AN_DRAW, sv)).toBe('2 - 2');
	});

	it('gives a Schackfyran walkover loser the participation point', () => {
		// OPEN SDK QUESTION: calculatePoints returns [win, loss] = [3, 1] here,
		// but ResultDisplay.SCHACK4AN_WHITE_WIN_WO is the string '3 - 0 w.o'.
		// The SDK's two paths disagree, and Schackfyran is the only point system
		// where loss !== 0 so it's the only one affected. This asserts the current
		// parseResultDisplay behaviour; if the SDK settles on 0 for a forfeiting
		// player, update this expectation.
		expect(formatResultCode(ResultCode.SCHACK4AN_WHITE_WIN_WO, sv)).toBe('3 - 1 w.o');
		expect(formatResultCode(ResultCode.SCHACK4AN_BLACK_WIN_WO, sv)).toBe('1 - 3 w.o');
		// 3-1-0 has loss === 0, so both SDK paths agree there.
		expect(formatResultCode(ResultCode.POINT310_WHITE_WIN_WO, sv)).toBe('3 - 0 w.o');
	});

	it('renders 3-1-0 scores', () => {
		expect(formatResultCode(ResultCode.POINT310_WHITE_WIN, sv)).toBe('3 - 0');
		expect(formatResultCode(ResultCode.POINT310_DRAW, sv)).toBe('1 - 1');
		expect(formatResultCode(ResultCode.POINT310_BOTH_NO_RESULT, sv)).toBe('0 - 0 domslut');
	});
});

describe('formatIndividualRowResult', () => {
	it('prefers the game code over the row points', () => {
		expect(formatIndividualRowResult(row(ResultCode.WHITE_WIN, 1, 0), sv)).toBe('1 - 0');
	});

	it('keeps a real 0-0 result instead of treating it as unplayed', () => {
		expect(formatIndividualRowResult(row(ResultCode.NO_WIN_WO, 0, 0), sv)).toBe('0 - 0 w.o');
		expect(formatIndividualRowResult(row(ResultCode.BOTH_NO_RESULT, 0, 0), sv)).toBe(
			'0 - 0 domslut'
		);
		expect(formatIndividualRowResult(row(ResultCode.POSTPONED, 0, 0), sv)).toBe('Uppskjutet');
	});

	it('falls back to the row points when the code carries no information', () => {
		// Seen live in Schackfyran groups: code NOT_SET but real points published.
		expect(formatIndividualRowResult(row(ResultCode.NOT_SET, 2, 2), sv)).toBe('2 - 2');
		expect(formatIndividualRowResult(row(9999, 5, 0), sv)).toBe('5 - 0');
	});

	it('treats 0-0 in the points fallback as not played', () => {
		expect(formatIndividualRowResult(row(ResultCode.NOT_SET, 0, 0), sv)).toBe('-');
		expect(formatIndividualRowResult(row(undefined, 0, 0), sv)).toBe('-');
	});

	it('uses the row points when there is no game row at all', () => {
		expect(formatIndividualRowResult(row(undefined, 1, 0), sv)).toBe('1 - 0');
	});

	it('refuses a team row rather than reporting board 1 as the match score', () => {
		// Live shape: group 3958 round 1 — 5 boards, match score 1.5 - 3.5.
		const teamRow = {
			homeResult: 1.5,
			awayResult: 3.5,
			games: [1, 1, 1, -1, 0].map((result) => ({ result }) as never)
		};
		expect(formatIndividualRowResult(teamRow, sv)).toBe('-');
	});
});

describe('formatResult label injection', () => {
	it('honours a caller-supplied noResult (pairing sheets print a blank)', () => {
		const blank = { ...sv, noResult: '' };
		expect(
			formatResult(
				{ home: null, away: null, kind: 'none', pointSystem: -1, informative: false },
				blank
			)
		).toBe('');
	});

	it('does not translate w.o', () => {
		const en: ResultLabels = {
			postponed: 'Postponed',
			adjudicated: 'adj',
			bye: 'Bye',
			noResult: '-'
		};
		expect(formatResultCode(ResultCode.WHITE_WIN_WO, en)).toBe('1 - 0 w.o');
		expect(formatResultCode(ResultCode.BOTH_NO_RESULT, en)).toBe('0 - 0 adj');
	});
});

/** A board already oriented home-left by `boardGames`. */
const board = (over: Partial<BoardGame> = {}): BoardGame => ({
	boardNumber: 1,
	homePlayerId: 111,
	awayPlayerId: 222,
	homeScore: 0,
	awayScore: 0,
	isWalkover: false,
	resultCode: null,
	...over
});

describe('formatBoardResult', () => {
	it("renders the score from the home team's side", () => {
		// The result code is written from white's side; `boardGames` has already
		// turned it into home and away points, so this must not re-read the code.
		expect(
			formatBoardResult(board({ homeScore: 0, awayScore: 1, resultCode: ResultCode.WHITE_WIN }), sv)
		).toBe('0 - 1');
	});

	it('renders half points as ½', () => {
		expect(
			formatBoardResult(board({ homeScore: 0.5, awayScore: 0.5, resultCode: ResultCode.DRAW }), sv)
		).toBe('½ - ½');
	});

	it('suffixes a walkover', () => {
		expect(
			formatBoardResult(
				board({
					homeScore: 1,
					awayScore: 0,
					isWalkover: true,
					resultCode: ResultCode.WHITE_WIN_WO
				}),
				sv
			)
		).toBe('1 - 0 w.o');
	});

	it('suffixes an adjudicated result with the translated word', () => {
		expect(formatBoardResult(board({ resultCode: ResultCode.BOTH_NO_RESULT }), sv)).toBe(
			`0 - 0 ${sv.adjudicated}`
		);
	});

	it('shows no result for a board that has not been played', () => {
		expect(formatBoardResult(board({ resultCode: null }), sv)).toBe('-');
	});
});

describe('formatTeamMatchScore', () => {
	it('renders the match score', () => {
		expect(formatTeamMatchScore({ homeResult: 5, awayResult: 3 }, sv)).toBe('5 - 3');
	});

	it('leaves a half point on a whole number alone', () => {
		// `formatScore` only turns a bare 0.5 into ½; 4.5 board points stay 4.5,
		// which is what the React version printed.
		expect(formatTeamMatchScore({ homeResult: 4.5, awayResult: 3.5 }, sv)).toBe('4.5 - 3.5');
	});

	it('reads 0 - 0 as not played, which is what the API means by it', () => {
		// A genuine double forfeit is recorded on the boards, not by zeroing the
		// match score — so this is safe.
		expect(formatTeamMatchScore({ homeResult: 0, awayResult: 0 }, sv)).toBe('-');
	});
});
