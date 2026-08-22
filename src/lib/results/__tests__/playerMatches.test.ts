import { describe, it, expect } from 'vitest';
import {
	ResultCode,
	normalizeEloLookupDate,
	type GameDto,
	type TournamentRoundResultDto
} from '$lib/api';
import { playerMatchLookups, playerMatches, type PlayerMatchesInput } from '../playerMatches';

const ME = 42;

const game = (whiteId: number, blackId: number, result?: number, tableNr = 0): GameDto =>
	({ tableNr, whiteId, blackId, result }) as GameDto;

/** An individual event's row is the pairing; its code lives in games[0]. */
const solo = (over: Partial<TournamentRoundResultDto> = {}): TournamentRoundResultDto =>
	({
		roundNr: 1,
		homeId: ME,
		awayId: 99,
		homeResult: 1,
		awayResult: 0,
		date: '2026-01-15',
		games: [game(ME, 99, ResultCode.WHITE_WIN)],
		...over
	}) as TournamentRoundResultDto;

/** A team event's row is the match; the player's game is one board in games[]. */
const team = (over: Partial<TournamentRoundResultDto> = {}): TournamentRoundResultDto =>
	({
		roundNr: 1,
		homeId: 10,
		homeTeamNumber: 1,
		awayId: 20,
		awayTeamNumber: 1,
		homeResult: 5,
		awayResult: 3,
		date: '2026-01-15',
		games: [game(ME, 99, ResultCode.WHITE_WIN)],
		...over
	}) as TournamentRoundResultDto;

const build = (over: Partial<PlayerMatchesInput> = {}) =>
	playerMatches({
		memberId: ME,
		isTeamTournament: false,
		individualRoundResults: [],
		teamRoundResults: [],
		ratedTypeOfRound: () => undefined,
		...over
	});

describe('playerMatches — individual events', () => {
	it('keeps only rows the player appears in, from either side', () => {
		const rows = [solo(), solo({ homeId: 7, awayId: ME }), solo({ homeId: 7, awayId: 8 })];
		expect(build({ individualRoundResults: rows })).toHaveLength(2);
	});

	it('takes the home side to be white — the row has no colour field', () => {
		expect(build({ individualRoundResults: [solo()] })[0].color).toBe('white');
		expect(build({ individualRoundResults: [solo({ homeId: 7, awayId: ME })] })[0].color).toBe(
			'black'
		);
	});

	it('names the other side as the opponent', () => {
		expect(build({ individualRoundResults: [solo()] })[0].opponentId).toBe(99);
		expect(build({ individualRoundResults: [solo({ homeId: 7, awayId: ME })] })[0].opponentId).toBe(
			7
		);
	});

	it('reads the outcome through the result code, from the player’s side', () => {
		// White wins. As white that is a win; the same code seen from black is a loss.
		expect(build({ individualRoundResults: [solo()] })[0].result).toBe('win');
		const asBlack = build({
			individualRoundResults: [
				solo({ homeId: 7, awayId: ME, games: [game(7, ME, ResultCode.WHITE_WIN)] })
			]
		});
		expect(asBlack[0].result).toBe('loss');
	});

	it('falls back to comparing points when the row carries no code', () => {
		// Older rows have no games array at all.
		const rows = [solo({ games: undefined, homeResult: 1, awayResult: 0 })];
		expect(build({ individualRoundResults: rows })[0].result).toBe('win');

		const drawn = [solo({ games: undefined, homeResult: 0.5, awayResult: 0.5 })];
		expect(build({ individualRoundResults: drawn })[0].result).toBe('draw');

		const lost = [solo({ games: undefined, homeResult: 0, awayResult: 1 })];
		expect(build({ individualRoundResults: lost })[0].result).toBe('loss');
	});

	it('is neither a walkover nor countable when there is no code to judge by', () => {
		const [match] = build({ individualRoundResults: [solo({ games: undefined })] });
		expect(match.isWalkover).toBe(false);
		expect(match.isCountable).toBe(false);
		expect(match.resultCode).toBeUndefined();
	});

	it('marks a walkover', () => {
		const rows = [solo({ games: [game(ME, 99, ResultCode.WHITE_WIN_WO)] })];
		expect(build({ individualRoundResults: rows })[0].isWalkover).toBe(true);
	});

	it('does not count a result code that is not a result', () => {
		for (const code of [ResultCode.NOT_SET, ResultCode.POSTPONED]) {
			const rows = [solo({ games: [game(ME, 99, code)] })];
			expect(build({ individualRoundResults: rows })[0].isCountable).toBe(false);
		}
	});

	it('takes the points from the player’s own side', () => {
		const [asHome] = build({ individualRoundResults: [solo({ homeResult: 1, awayResult: 0 })] });
		expect([asHome.playerPoints, asHome.opponentPoints]).toEqual([1, 0]);

		const [asAway] = build({
			individualRoundResults: [solo({ homeId: 7, awayId: ME, homeResult: 1, awayResult: 0 })]
		});
		expect([asAway.playerPoints, asAway.opponentPoints]).toEqual([0, 1]);
	});
});

describe('playerMatches — team events', () => {
	const asTeam = (rows: TournamentRoundResultDto[]) =>
		build({ isTeamTournament: true, teamRoundResults: rows });

	it('finds the player’s board inside the match', () => {
		const rows = [team({ games: [game(7, 8), game(ME, 99, ResultCode.WHITE_WIN), game(11, 12)] })];
		const matches = asTeam(rows);
		expect(matches).toHaveLength(1);
		expect(matches[0].opponentId).toBe(99);
	});

	it('takes colour from the board, not from which team was at home', () => {
		// The player is black on this board even though their club is the home team.
		const rows = [team({ games: [game(99, ME, ResultCode.BLACK_WIN)] })];
		expect(asTeam(rows)[0].color).toBe('black');
	});

	it('scores the board, not the match', () => {
		// The row says the teams finished 5-3; the player's own board is what counts.
		const rows = [team({ homeResult: 5, awayResult: 3, games: [game(ME, 99, ResultCode.DRAW)] })];
		const [match] = asTeam(rows);
		expect([match.playerPoints, match.opponentPoints]).toEqual([0.5, 0.5]);
	});

	it('handles an alternate point system', () => {
		// Schack4an pays 3-2-1 rather than 1-½-0.
		const rows = [team({ games: [game(ME, 99, ResultCode.SCHACK4AN_WHITE_WIN)] })];
		const [match] = asTeam(rows);
		expect(match.result).toBe('win');
		expect(match.playerPoints).toBeGreaterThan(match.opponentPoints);
	});

	it('ignores rounds the player did not play in', () => {
		expect(asTeam([team({ games: [game(7, 8)] })])).toEqual([]);
	});
});

describe('playerMatches — shared behaviour', () => {
	it('orders by round', () => {
		const rows = [solo({ roundNr: 3 }), solo({ roundNr: 1 }), solo({ roundNr: 2 })];
		expect(build({ individualRoundResults: rows }).map((m) => m.round)).toEqual([1, 2, 3]);
	});

	it('treats a row with no round number as round 1', () => {
		expect(build({ individualRoundResults: [solo({ roundNr: undefined })] })[0].round).toBe(1);
	});

	it('carries the round’s own rating type', () => {
		const rows = [solo({ roundNr: 2 })];
		const matches = build({
			individualRoundResults: rows,
			ratedTypeOfRound: (round) => (round === 2 ? 3 : undefined)
		});
		expect(matches[0].roundRatedType).toBe(3);
	});

	it('still lists a match whose date cannot be read', () => {
		// The game was played; only the rating lookup is impossible.
		const [match] = build({ individualRoundResults: [solo({ date: '0' })] });
		expect(match).toBeDefined();
		expect(match.roundDate).toBeNaN();
	});
});

describe('playerMatchLookups', () => {
	const monthOf = (iso: string) => normalizeEloLookupDate(Date.parse(iso));

	it('asks for the player and the opponent, at the round’s month', () => {
		const matches = build({ individualRoundResults: [solo()] });
		expect(playerMatchLookups(matches, ME)).toEqual([
			{ playerId: ME, date: monthOf('2026-01-15') },
			{ playerId: 99, date: monthOf('2026-01-15') }
		]);
	});

	it('asks for the player once per month, not once per game', () => {
		const rows = [solo({ roundNr: 1 }), solo({ roundNr: 2, awayId: 77 })];
		const lookups = playerMatchLookups(build({ individualRoundResults: rows }), ME);
		expect(lookups.filter((l) => l.playerId === ME)).toHaveLength(1);
		expect(lookups).toHaveLength(3);
	});

	it('skips a bye or walkover opponent, whose negative id answers 502', () => {
		const rows = [solo({ awayId: -100 }), solo({ roundNr: 2, awayId: -1 })];
		const lookups = playerMatchLookups(build({ individualRoundResults: rows }), ME);
		expect(lookups.every((l) => l.playerId > 0)).toBe(true);
	});

	it('skips a round with no readable date — there is no month to ask about', () => {
		const rows = [solo({ date: 'not a date' })];
		expect(playerMatchLookups(build({ individualRoundResults: rows }), ME)).toEqual([]);
	});

	it('has nothing to ask for without matches', () => {
		expect(playerMatchLookups([], ME)).toEqual([]);
	});
});
