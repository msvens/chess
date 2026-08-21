/**
 * Turning team round rows into matches and boards.
 *
 * Ports the grouping and per-board processing that lived inside
 * `components/results/TeamRoundResults.tsx`. A plain module rather than part of
 * the component, because the colour rule and the walkover handling are the parts
 * worth pinning with tests.
 *
 * A team round comes back as one row per *match*, with every board in the row's
 * `games[]` — checked across Allsvenskan 2025/26, Stockholmsserien 2025/26 and
 * two legacy seasons. The grouping still accumulates across rows, because a row
 * carries its own `board` field, and summing is correct either way.
 */
import {
	calculatePoints,
	getOpponentKind,
	isWalkoverResultCode,
	type GameDto,
	type TournamentRoundResultDto
} from '$lib/api';

/** One team-vs-team match in a round. */
export interface TeamMatch {
	/** Identity of the pairing — two teams of the same club can meet. */
	key: string;
	roundNr: number;
	homeId: number;
	awayId: number;
	homeTeamNumber: number;
	awayTeamNumber: number;
	/** Match score. `0 - 0` means the match has not been played (the SDK's rule). */
	homeResult: number;
	awayResult: number;
	date: string;
	rows: TournamentRoundResultDto[];
}

/** One board of a match, oriented so the home team is always the left column. */
export interface BoardGame {
	boardNumber: number;
	homePlayerId: number;
	awayPlayerId: number;
	/** Points from the home team's side of the board. */
	homeScore: number;
	awayScore: number;
	isWalkover: boolean;
	resultCode: number | null;
}

/**
 * Identity of a pairing.
 *
 * The team numbers are part of it: a club can enter several teams in one group,
 * so "Rockaden vs Wasa" does not tell Rockaden 1's match from Rockaden 2's.
 */
export function matchKey(
	row: Pick<TournamentRoundResultDto, 'homeId' | 'homeTeamNumber' | 'awayId' | 'awayTeamNumber'>
): string {
	return `${row.homeId}-${row.homeTeamNumber}-${row.awayId}-${row.awayTeamNumber}`;
}

/**
 * Matches by round number, each in the order the API listed them.
 *
 * A row with no `roundNr` becomes round 1, matching the individual path.
 */
export function groupMatchesByRound(
	rows: readonly TournamentRoundResultDto[]
): Map<number, TeamMatch[]> {
	const byRound = new Map<number, TeamMatch[]>();

	for (const row of rows) {
		const roundNr = row.roundNr || 1;
		let matches = byRound.get(roundNr);
		if (!matches) {
			matches = [];
			byRound.set(roundNr, matches);
		}

		const key = matchKey(row);
		let match = matches.find((m) => m.key === key);
		if (!match) {
			match = {
				key,
				roundNr,
				homeId: row.homeId,
				awayId: row.awayId,
				homeTeamNumber: row.homeTeamNumber,
				awayTeamNumber: row.awayTeamNumber,
				homeResult: 0,
				awayResult: 0,
				date: row.date,
				rows: []
			};
			matches.push(match);
		}

		match.rows.push(row);
		match.homeResult += row.homeResult || 0;
		match.awayResult += row.awayResult || 0;
	}

	return byRound;
}

/**
 * Whether the home team had white on a board.
 *
 * In team chess the away team has white on board 1 and colours alternate down
 * the boards. `tableNr` is 0-based, so an odd `tableNr` is a board where the
 * home team is white.
 */
export function homeIsWhiteOnBoard(tableNr: number): boolean {
	return tableNr % 2 === 1;
}

/**
 * A match's boards, oriented home-left and ordered by board number.
 *
 * Byes and walkovers keep their negative ids so the caller can label them; not
 * asking the API about those ids is the caller's job.
 */
export function boardGames(match: TeamMatch): BoardGame[] {
	const games: GameDto[] = match.rows.flatMap((row) => row.games ?? []);

	return games
		.map((game): BoardGame => {
			const tableNr = game.tableNr ?? 0;
			const whiteIsHome = homeIsWhiteOnBoard(tableNr);
			const whiteKind = getOpponentKind(game.whiteId);
			const blackKind = getOpponentKind(game.blackId);

			// `isWalkoverResultCode` covers every point system (2/-2/-3, 5/-5,
			// 25/-25); the `Math.abs(result) === 2` test it replaced missed the
			// Schackfyran and 3-1-0 codes and the 0-0 double forfeit.
			const isWalkover =
				(game.result != null && isWalkoverResultCode(game.result)) ||
				whiteKind !== 'paired' ||
				blackKind !== 'paired';

			// Both slots empty means no game was scheduled at all, so there is
			// nothing to award.
			let homeScore = 0;
			let awayScore = 0;
			if (game.result != null && !(whiteKind !== 'paired' && blackKind !== 'paired')) {
				const [whitePoints, blackPoints] = calculatePoints(game.result);
				homeScore = whiteIsHome ? whitePoints : blackPoints;
				awayScore = whiteIsHome ? blackPoints : whitePoints;
			}

			return {
				boardNumber: tableNr + 1,
				homePlayerId: whiteIsHome ? game.whiteId : game.blackId,
				awayPlayerId: whiteIsHome ? game.blackId : game.whiteId,
				homeScore,
				awayScore,
				isWalkover,
				resultCode: game.result ?? null
			};
		})
		.sort((a, b) => a.boardNumber - b.boardNumber);
}

/**
 * The players of a match whose historical ratings are worth fetching.
 *
 * Bye and walkover slots are dropped — schack.se answers their negative ids with
 * a 502.
 */
export function boardPlayerIds(boards: readonly BoardGame[]): number[] {
	const ids = new Set<number>();
	for (const board of boards) {
		if (getOpponentKind(board.homePlayerId) === 'paired') ids.add(board.homePlayerId);
		if (getOpponentKind(board.awayPlayerId) === 'paired') ids.add(board.awayPlayerId);
	}
	return [...ids];
}
