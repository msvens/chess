/**
 * One player's games within a single group.
 *
 * Ports the two loops of `[memberId]/page.tsx` that walk the group's round
 * results looking for a player. They differ more than they look: an individual
 * event puts the pairing on the row itself and the result code inside
 * `games[0]`, while a team event puts every board in `games[]` and the row
 * describes the *match*, not the player. Getting the branch wrong shows the
 * right opponent with the wrong score.
 *
 * Pure, so the branch matrix — individual vs team, result code vs points
 * fallback, walkovers, alternate point systems — can be pinned directly rather
 * than read out of a seven-column table.
 */
import {
	calculatePoints,
	getOpponentKind,
	getPlayerOutcome,
	isCountableResult,
	isWalkoverResultCode,
	normalizeEloLookupDate,
	type TournamentRoundResultDto
} from '$lib/api';
import { parseDateToTimestamp, type PlayerDateLookup } from './roundGrouping';

export interface PlayerMatch {
	round: number;
	/** Epoch ms of the round; `NaN` when the API's date is unreadable. */
	roundDate: number;
	/**
	 * The opponent's id, not a player record. Resolving it is the caller's job —
	 * the store's `getPlayerName` already knows how, including that a negative id
	 * is a bye or a walkover rather than a person.
	 */
	opponentId: number;
	result: 'win' | 'draw' | 'loss';
	/** In an individual event the home side is taken to be white; there is no colour field. */
	color: 'white' | 'black';
	/** Points from this player's side, in the event's own point system. */
	playerPoints: number;
	opponentPoints: number;
	isWalkover: boolean;
	/** False for `NOT_SET`, `POSTPONED` and friends — a code that is not a result. */
	isCountable: boolean;
	resultCode?: number;
	/** The round's own rating type, where it has one. */
	roundRatedType?: number;
}

export interface PlayerMatchesInput {
	memberId: number;
	isTeamTournament: boolean;
	individualRoundResults: readonly TournamentRoundResultDto[];
	teamRoundResults: readonly TournamentRoundResultDto[];
	ratedTypeOfRound: (round: number) => number | undefined;
}

/** Every game this player played in the group, oldest round first. */
export function playerMatches(input: PlayerMatchesInput): PlayerMatch[] {
	const matches = input.isTeamTournament ? teamMatches(input) : individualMatches(input);
	return matches.sort((a, b) => a.round - b.round);
}

/**
 * A team event's rows describe a match; the player's own game is one board
 * inside `games[]`, and the row's `homeResult`/`awayResult` are the *teams'*
 * scores, so the player's points come from the board's own code.
 */
function teamMatches({
	memberId,
	teamRoundResults,
	ratedTypeOfRound
}: PlayerMatchesInput): PlayerMatch[] {
	const matches: PlayerMatch[] = [];

	for (const row of teamRoundResults) {
		const round = row.roundNr || 1;
		const roundDate = parseDateToTimestamp(row.date);
		const roundRatedType = ratedTypeOfRound(round);

		for (const game of row.games ?? []) {
			if (game.whiteId !== memberId && game.blackId !== memberId) continue;

			const isWhite = game.whiteId === memberId;
			const [whitePoints, blackPoints] = calculatePoints(game.result);

			matches.push({
				round,
				roundDate,
				opponentId: isWhite ? game.blackId : game.whiteId,
				result: getPlayerOutcome(game.result, isWhite) ?? 'loss',
				color: isWhite ? 'white' : 'black',
				playerPoints: isWhite ? whitePoints : blackPoints,
				opponentPoints: isWhite ? blackPoints : whitePoints,
				isWalkover: isWalkoverResultCode(game.result),
				isCountable: isCountableResult(game.result),
				resultCode: game.result,
				roundRatedType
			});
		}
	}

	return matches;
}

/**
 * An individual event's row *is* the pairing, and its result code sits in
 * `games[0]`. Older rows carry no code at all, which is what the points
 * comparison is for.
 */
function individualMatches({
	memberId,
	individualRoundResults,
	ratedTypeOfRound
}: PlayerMatchesInput): PlayerMatch[] {
	const matches: PlayerMatch[] = [];

	for (const row of individualRoundResults) {
		if (row.homeId !== memberId && row.awayId !== memberId) continue;

		const isHome = row.homeId === memberId;
		const round = row.roundNr || 1;
		const resultCode = row.games?.[0]?.result;

		const playerPoints = isHome ? row.homeResult : row.awayResult;
		const opponentPoints = isHome ? row.awayResult : row.homeResult;

		matches.push({
			round,
			roundDate: parseDateToTimestamp(row.date),
			opponentId: isHome ? row.awayId : row.homeId,
			result: outcomeOf(resultCode, isHome, playerPoints, opponentPoints),
			color: isHome ? 'white' : 'black',
			playerPoints,
			opponentPoints,
			isWalkover: resultCode !== undefined && isWalkoverResultCode(resultCode),
			isCountable: resultCode !== undefined && isCountableResult(resultCode),
			resultCode,
			roundRatedType: ratedTypeOfRound(round)
		});
	}

	return matches;
}

function outcomeOf(
	resultCode: number | undefined,
	isHome: boolean,
	playerPoints: number,
	opponentPoints: number
): 'win' | 'draw' | 'loss' {
	if (resultCode !== undefined) return getPlayerOutcome(resultCode, isHome) ?? 'loss';
	if (playerPoints > opponentPoints) return 'win';
	return playerPoints === opponentPoints ? 'draw' : 'loss';
}

/**
 * The (player, month) pairs these matches need historical ratings for — the
 * player themself once per round, plus each opponent.
 *
 * Byes and walkovers are dropped: schack.se answers their negative ids with a
 * 502. So is any round whose date could not be read, since there is no month to
 * ask about.
 */
export function playerMatchLookups(
	matches: readonly PlayerMatch[],
	memberId: number
): PlayerDateLookup[] {
	const seen = new Set<string>();
	const lookups: PlayerDateLookup[] = [];

	const add = (playerId: number, date: number) => {
		if (getOpponentKind(playerId) !== 'paired') return;
		const key = `${playerId}@${date}`;
		if (seen.has(key)) return;
		seen.add(key);
		lookups.push({ playerId, date });
	};

	for (const match of matches) {
		if (Number.isNaN(match.roundDate) || match.roundDate <= 0) continue;
		const date = normalizeEloLookupDate(match.roundDate);
		add(memberId, date);
		add(match.opponentId, date);
	}

	return lookups;
}
