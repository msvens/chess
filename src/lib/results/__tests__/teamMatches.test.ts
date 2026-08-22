import { describe, it, expect } from 'vitest';
import { ResultCode, type GameDto, type TournamentRoundResultDto } from '$lib/api';
import {
	boardGames,
	boardPlayerIds,
	flipBoard,
	groupMatchesByRound,
	homeIsWhiteOnBoard,
	matchKey
} from '../teamMatches';

const game = (tableNr: number, whiteId: number, blackId: number, result?: number): GameDto =>
	({ tableNr, whiteId, blackId, result }) as GameDto;

const row = (over: Partial<TournamentRoundResultDto> = {}): TournamentRoundResultDto =>
	({
		roundNr: 1,
		homeId: 10,
		homeTeamNumber: 1,
		awayId: 20,
		awayTeamNumber: 1,
		homeResult: 0,
		awayResult: 0,
		date: '2025-10-05',
		games: [],
		...over
	}) as TournamentRoundResultDto;

describe('matchKey', () => {
	it('distinguishes two teams of the same club', () => {
		// "Rockaden vs Wasa" is ambiguous when Rockaden enters three teams.
		const first = matchKey({ homeId: 10, homeTeamNumber: 1, awayId: 20, awayTeamNumber: 1 });
		const second = matchKey({ homeId: 10, homeTeamNumber: 2, awayId: 20, awayTeamNumber: 1 });
		expect(first).not.toBe(second);
	});

	it('distinguishes home from away', () => {
		expect(matchKey({ homeId: 10, homeTeamNumber: 1, awayId: 20, awayTeamNumber: 1 })).not.toBe(
			matchKey({ homeId: 20, homeTeamNumber: 1, awayId: 10, awayTeamNumber: 1 })
		);
	});
});

describe('groupMatchesByRound', () => {
	it('indexes matches by round', () => {
		const byRound = groupMatchesByRound([
			row(),
			row({ roundNr: 2 }),
			row({ roundNr: 2, awayId: 30 })
		]);
		expect(byRound.get(1)).toHaveLength(1);
		expect(byRound.get(2)).toHaveLength(2);
	});

	it('treats a row with no round number as round 1', () => {
		const byRound = groupMatchesByRound([row({ roundNr: undefined })]);
		expect(byRound.get(1)).toHaveLength(1);
	});

	it('carries the match score through', () => {
		const [match] = groupMatchesByRound([row({ homeResult: 4.5, awayResult: 3.5 })]).get(1)!;
		expect(match.homeResult).toBe(4.5);
		expect(match.awayResult).toBe(3.5);
	});

	it('keeps two teams of one club as separate matches', () => {
		const byRound = groupMatchesByRound([row({ homeTeamNumber: 1 }), row({ homeTeamNumber: 2 })]);
		expect(byRound.get(1)).toHaveLength(2);
	});

	it('accumulates a match split over several rows', () => {
		// Real data puts every board in one row, but the row carries its own
		// `board` field; summing is correct either way and losing half a match
		// would be silent.
		const byRound = groupMatchesByRound([
			row({ homeResult: 2, awayResult: 1, games: [game(0, 1, 2, ResultCode.BLACK_WIN)] }),
			row({ homeResult: 1.5, awayResult: 2.5, games: [game(1, 3, 4, ResultCode.WHITE_WIN)] })
		]);
		const [match] = byRound.get(1)!;
		expect(match.rows).toHaveLength(2);
		expect(match.homeResult).toBe(3.5);
		expect(match.awayResult).toBe(3.5);
		expect(boardGames(match)).toHaveLength(2);
	});

	it('is empty for no rows', () => {
		expect(groupMatchesByRound([]).size).toBe(0);
	});
});

describe('homeIsWhiteOnBoard', () => {
	it('gives the away team white on board 1 and alternates down', () => {
		// tableNr is 0-based: board 1 is tableNr 0.
		expect(homeIsWhiteOnBoard(0)).toBe(false);
		expect(homeIsWhiteOnBoard(1)).toBe(true);
		expect(homeIsWhiteOnBoard(2)).toBe(false);
		expect(homeIsWhiteOnBoard(3)).toBe(true);
	});
});

describe('boardGames', () => {
	const matchOf = (games: GameDto[]) => groupMatchesByRound([row({ games })]).get(1)![0];

	it('numbers boards from 1 and sorts by board', () => {
		const boards = boardGames(matchOf([game(2, 5, 6), game(0, 1, 2), game(1, 3, 4)]));
		expect(boards.map((b) => b.boardNumber)).toEqual([1, 2, 3]);
	});

	it('puts the home team in the left column on an away-white board', () => {
		// Board 1 (tableNr 0): away has white, so the black player is the home one.
		const [board] = boardGames(matchOf([game(0, 111, 222)]));
		expect(board.homePlayerId).toBe(222);
		expect(board.awayPlayerId).toBe(111);
	});

	it('puts the home team in the left column on a home-white board', () => {
		const [board] = boardGames(matchOf([game(1, 111, 222)]));
		expect(board.homePlayerId).toBe(111);
		expect(board.awayPlayerId).toBe(222);
	});

	it('reads the score through the colours', () => {
		// White wins on board 1, where white is the away team — so the point is
		// the away team's. Reading the code directly would credit the home side.
		const [board] = boardGames(matchOf([game(0, 111, 222, ResultCode.WHITE_WIN)]));
		expect(board.homeScore).toBe(0);
		expect(board.awayScore).toBe(1);
	});

	it('splits a draw', () => {
		const [board] = boardGames(matchOf([game(0, 111, 222, ResultCode.DRAW)]));
		expect(board.homeScore).toBe(0.5);
		expect(board.awayScore).toBe(0.5);
	});

	it('marks a walkover in any point system', () => {
		// The `Math.abs(result) === 2` test this replaced missed the Schackfyran
		// and 3-1-0 codes as well as the 0-0 double forfeit.
		for (const code of [
			ResultCode.WHITE_WIN_WO,
			ResultCode.NO_WIN_WO,
			ResultCode.SCHACK4AN_BLACK_WIN_WO,
			ResultCode.POINT310_WHITE_WIN_WO
		]) {
			const [board] = boardGames(matchOf([game(0, 111, 222, code)]));
			expect(board.isWalkover).toBe(true);
		}
	});

	it('marks a board with an unplayed slot as a walkover', () => {
		const [board] = boardGames(matchOf([game(0, 111, -1, ResultCode.WHITE_WIN)]));
		expect(board.isWalkover).toBe(true);
	});

	it('awards nothing when neither side turned up', () => {
		const [board] = boardGames(matchOf([game(0, -1, -100, ResultCode.NO_WIN_WO)]));
		expect(board.homeScore).toBe(0);
		expect(board.awayScore).toBe(0);
	});

	it('keeps a missing result as null rather than a zero score', () => {
		const [board] = boardGames(matchOf([game(0, 111, 222)]));
		expect(board.resultCode).toBeNull();
	});

	it('has no boards for a match whose games have not been published', () => {
		expect(boardGames(matchOf([]))).toEqual([]);
	});
});

describe('boardPlayerIds', () => {
	const matchOf = (games: GameDto[]) => groupMatchesByRound([row({ games })]).get(1)![0];

	it('collects both players of every board, once each', () => {
		const ids = boardPlayerIds(boardGames(matchOf([game(0, 1, 2), game(1, 3, 4), game(2, 1, 5)])));
		expect(ids.sort()).toEqual([1, 2, 3, 4, 5]);
	});

	it('skips bye and walkover slots, whose negative ids answer 502', () => {
		const ids = boardPlayerIds(boardGames(matchOf([game(0, 111, -100), game(1, -1, 222)])));
		expect(ids.sort((a, b) => a - b)).toEqual([111, 222]);
	});

	it('is empty without boards', () => {
		expect(boardPlayerIds([])).toEqual([]);
	});
});

describe('flipBoard', () => {
	const matchOf = (games: GameDto[]) => groupMatchesByRound([row({ games })]).get(1)![0];

	it('swaps the two sides, so a chosen away team reads as the left column', () => {
		// Board 1: away has white. White wins, so home scores 0. Seen from the away
		// team's own page, that same board must read as their win.
		const [board] = boardGames(matchOf([game(0, 111, 222, ResultCode.WHITE_WIN)]));
		expect([board.homePlayerId, board.homeScore]).toEqual([222, 0]);

		const flipped = flipBoard(board);
		expect(flipped.homePlayerId).toBe(111);
		expect(flipped.awayPlayerId).toBe(222);
		expect(flipped.homeScore).toBe(1);
		expect(flipped.awayScore).toBe(0);
	});

	it('leaves the board number, walkover flag and result code alone', () => {
		const [board] = boardGames(matchOf([game(2, 111, 222, ResultCode.NO_WIN_WO)]));
		const flipped = flipBoard(board);
		expect(flipped.boardNumber).toBe(board.boardNumber);
		expect(flipped.isWalkover).toBe(board.isWalkover);
		expect(flipped.resultCode).toBe(board.resultCode);
	});

	it('is its own inverse', () => {
		const [board] = boardGames(matchOf([game(1, 111, 222, ResultCode.DRAW)]));
		expect(flipBoard(flipBoard(board))).toEqual(board);
	});
});
