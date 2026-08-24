/**
 * A player's tournament history, derived from their games.
 *
 * Ports the four-step loop in `players/[memberId]/layout.tsx` that turned a flat
 * `GameDto[]` into one row per group. Pure, so the parts worth pinning — which
 * games count towards W/D/L, how an event with no games played yet still shows
 * up, the ordering — can be tested without a store or a component.
 *
 * The API answers with games, not tournaments: a group is only known to be part
 * of this player's history because a game references it. Events they registered
 * for but have not played come from a second endpoint and carry no games at all.
 */
import {
	calculatePlayerPoints,
	calculatePlayerResult,
	findTournamentGroup,
	getOpponentKind,
	isTeamTournament,
	parseLocalDate,
	type GameDto,
	type PlayerInfoDto,
	type TournamentDto
} from '$lib/api';

/** One group this player took part in, with their record in it. */
export interface TournamentParticipation {
	groupId: number;
	tournament: TournamentDto;
	gameCount: number;
	groupName: string;
	groupStartDate: string;
	groupEndDate: string;
	className: string;
	/** Whether the class name is worth showing — a one-class event repeats itself. */
	hasMultipleClasses: boolean;
	isTeam: boolean;
	wins: number;
	draws: number;
	losses: number;
	/** In the event's own point system, so Schackfyran's 3-2-1 stays 3-2-1. */
	totalPoints: number;
	/** Registered, but no games played yet. */
	isUpcoming?: boolean;
}

/** A player's record within one group. */
interface GroupRecord {
	gameCount: number;
	wins: number;
	draws: number;
	losses: number;
	totalPoints: number;
}

const emptyRecord = (): GroupRecord => ({
	gameCount: 0,
	wins: 0,
	draws: 0,
	losses: 0,
	totalPoints: 0
});

/**
 * The opponents worth asking the API about.
 *
 * Negative ids are byes and walkovers rather than people, and schack.se answers
 * them with a 502. The React version guarded only `-1`, which is the value that
 * actually turns up in this endpoint; `getOpponentKind` covers the whole
 * negative space, which is the rule the rest of the app already follows.
 */
export function opponentIds(games: readonly GameDto[], memberId: number): number[] {
	const ids = new Set<number>();
	for (const game of games) {
		for (const id of [game.whiteId, game.blackId]) {
			if (id !== memberId && getOpponentKind(id) === 'paired') ids.add(id);
		}
	}
	return [...ids];
}

/** Every group these games touch, in first-seen order. */
export function playedGroupIds(games: readonly GameDto[]): number[] {
	const ids = new Set<number>();
	for (const game of games) ids.add(game.groupiD);
	return [...ids];
}

/**
 * Groups the player is entered in but has no games for.
 *
 * The two endpoints overlap: `getMemberTournamentResults` lists everything
 * entered, played or not, so anything already known from a game is dropped.
 */
export function upcomingGroupIds(
	entries: readonly { groupId: number }[],
	played: readonly number[]
): number[] {
	const seen = new Set(played);
	const upcoming: number[] = [];
	for (const entry of entries) {
		if (seen.has(entry.groupId)) continue;
		seen.add(entry.groupId);
		upcoming.push(entry.groupId);
	}
	return upcoming;
}

/**
 * The tournaments behind a player's games, as the SDK's helpers want them.
 *
 * `filterGamesByTimeControl` and `gamesToDisplayFormat` take a real `Map`. The
 * React version passed `{ get } as Map<...>`, a cast that told the type system
 * something untrue. Building the map costs nothing and is honest; groups the
 * lookup cannot answer for are simply absent, which is what the helpers expect.
 */
export function tournamentMapFor(
	games: readonly GameDto[],
	upcoming: readonly number[],
	tournamentOf: (groupId: number) => TournamentDto | undefined
): Map<number, TournamentDto> {
	const map = new Map<number, TournamentDto>();
	for (const groupId of [...playedGroupIds(games), ...upcoming]) {
		const tournament = tournamentOf(groupId);
		if (tournament) map.set(groupId, tournament);
	}
	return map;
}

/** The same, for the players these games name — the member included. */
export function playerMapFor(
	games: readonly GameDto[],
	memberId: number,
	playerOf: (playerId: number) => PlayerInfoDto | undefined
): Map<number, PlayerInfoDto> {
	const map = new Map<number, PlayerInfoDto>();
	for (const id of [memberId, ...opponentIds(games, memberId)]) {
		const player = playerOf(id);
		if (player) map.set(id, player);
	}
	return map;
}

/**
 * A player's record per group.
 *
 * A walkover *is* a win or a loss — checked against the SDK: code 2 scores a
 * full point for white, and a tourist walkover (29) scores a half. Only codes
 * that are not results at all (not set, postponed, double forfeit) return null
 * and fall out of W/D/L. They still count towards `gameCount`, which counts
 * rows; the outcome line is explicitly a W/D/L split, not a breakdown of it.
 */
export function recordsByGroup(
	games: readonly GameDto[],
	memberId: number
): Map<number, GroupRecord> {
	const byGroup = new Map<number, GroupRecord>();

	for (const game of games) {
		let record = byGroup.get(game.groupiD);
		if (!record) {
			record = emptyRecord();
			byGroup.set(game.groupiD, record);
		}

		record.gameCount += 1;

		const result = calculatePlayerResult(game, memberId);
		if (result === 'win') record.wins += 1;
		else if (result === 'draw') record.draws += 1;
		else if (result === 'loss') record.losses += 1;

		const points = calculatePlayerPoints(game, memberId);
		if (points !== null) record.totalPoints += points;
	}

	return byGroup;
}

/**
 * The history list, newest first.
 *
 * `tournamentOf` is the lookup rather than a `Map`, so the caller can hand over
 * the shared cache directly and stay reactive to it. A group whose tournament is
 * not (yet) known is skipped rather than rendered half-built.
 */
export function buildParticipations(
	games: readonly GameDto[],
	upcomingGroupIds: readonly number[],
	memberId: number,
	tournamentOf: (groupId: number) => TournamentDto | undefined
): TournamentParticipation[] {
	const records = recordsByGroup(games, memberId);
	const participations: TournamentParticipation[] = [];

	for (const groupId of playedGroupIds(games)) {
		const tournament = tournamentOf(groupId);
		if (!tournament) continue;
		participations.push(
			participation(groupId, tournament, records.get(groupId) ?? emptyRecord(), false)
		);
	}

	for (const groupId of upcomingGroupIds) {
		const tournament = tournamentOf(groupId);
		if (!tournament) continue;
		// A team event a player has merely been registered for says nothing about
		// them — the club entered the team, and there is no individual record to
		// show. Only individual events appear as upcoming.
		if (isTeamTournament(tournament.type)) continue;
		participations.push(participation(groupId, tournament, emptyRecord(), true));
	}

	return participations.sort((a, b) => endOf(b) - endOf(a));
}

function participation(
	groupId: number,
	tournament: TournamentDto,
	record: GroupRecord,
	isUpcoming: boolean
): TournamentParticipation {
	const found = findTournamentGroup(tournament, groupId);

	return {
		groupId,
		tournament,
		gameCount: record.gameCount,
		groupName: found?.group.name || '',
		groupStartDate: found?.group.start || tournament.start,
		groupEndDate: found?.group.end || tournament.end,
		className: found?.parentClass.className || '',
		hasMultipleClasses: found?.hasMultipleClasses ?? false,
		isTeam: isTeamTournament(tournament.type),
		wins: record.wins,
		draws: record.draws,
		losses: record.losses,
		totalPoints: record.totalPoints,
		...(isUpcoming ? { isUpcoming: true } : {})
	};
}

/**
 * Sort key. `parseLocalDate` rather than `new Date`, which UTC-parses a bare
 * `YYYY-MM-DD` — harmless in Sweden, wrong west of Greenwich, and inconsistent
 * with everywhere else in the app.
 */
function endOf(participation: TournamentParticipation): number {
	const time = parseLocalDate(participation.groupEndDate).getTime();
	return Number.isNaN(time) ? 0 : time;
}
