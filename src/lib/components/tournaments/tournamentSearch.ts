/**
 * Search helpers for the results page: deduplication, ordering, and the default
 * date range.
 *
 * Pure, and worth testing — the API returns a row per updated *group*, so the
 * same tournament arrives several times, and the two searches return different
 * shapes that both have to end up as `TournamentDto[]`.
 */
import type { GroupSearchAnswerDto, TournamentDto } from '$lib/api';

/** Milliseconds of `latestUpdated`, or 0 when it is missing. */
function updatedAt(t: Pick<TournamentDto, 'latestUpdated'>): number {
	return t.latestUpdated ? new Date(t.latestUpdated).getTime() : 0;
}

/**
 * One row per tournament, keeping whichever copy was updated most recently.
 * The date-range search returns a row per updated group, so duplicates are the
 * normal case rather than an edge one.
 */
export function deduplicateTournaments(tournaments: TournamentDto[]): TournamentDto[] {
	const byId = new Map<number, TournamentDto>();
	for (const tournament of tournaments) {
		const existing = byId.get(tournament.id);
		if (!existing || updatedAt(tournament) > updatedAt(existing)) {
			byId.set(tournament.id, tournament);
		}
	}
	return [...byId.values()];
}

/** Most recently updated first. */
export function sortByUpdated(tournaments: TournamentDto[]): TournamentDto[] {
	return [...tournaments].sort((a, b) => updatedAt(b) - updatedAt(a));
}

/**
 * Text search answers name a group, not a tournament, and carry only the
 * tournament's id and name. They are widened to `TournamentDto` so one list
 * component can render both searches.
 *
 * Everything else is left empty, which is why the category/type/status filters
 * cannot say anything useful about text-search results — see the note where they
 * are rendered.
 */
export function groupsToTournaments(groups: GroupSearchAnswerDto[]): TournamentDto[] {
	const byTournament = new Map<number, GroupSearchAnswerDto>();
	for (const group of groups) {
		if (!byTournament.has(group.tournamentid)) byTournament.set(group.tournamentid, group);
	}
	return [...byTournament.values()].map(
		(group) =>
			({
				id: group.tournamentid,
				name: group.tournamentname,
				start: '',
				end: '',
				city: '',
				arena: '',
				type: 0,
				ia: 0,
				secjudges: '',
				thinkingTime: '',
				state: 0,
				allowForeignPlayers: 0,
				teamtournamentPlayerListType: 0,
				ageFilter: 0,
				nrOfPartLink: '',
				orgType: 0,
				orgNumber: 0,
				ratingRegDate: '',
				ratingRegDate2: '',
				fideregged: 0,
				online: 0,
				y2cRules: 0,
				teamNrOfDaysRegged: 0,
				showPublic: 0,
				invitationurl: '',
				latestUpdated: group.latestUpdatedGame || '',
				secParsedJudges: [],
				rootClasses: []
			}) as TournamentDto
	);
}

function pad(n: number): string {
	return String(n).padStart(2, '0');
}

/** YYYY-MM-DD in local time. */
export function toDateInput(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The range the page opens with: the last ten days.
 *
 * Local, not `toISOString()`. The React version used the latter, so between
 * midnight and 02:00 Swedish time the default range silently started and ended a
 * day earlier than the user's "today".
 */
export function defaultDateRange(now = new Date()): { start: string; end: string } {
	const start = new Date(now);
	start.setDate(start.getDate() - 10);
	return { start: toDateInput(start), end: toDateInput(now) };
}

/** The SSF search endpoints want a full timestamp, not a bare date. */
export function toApiDate(dateInput: string): string {
	return `${dateInput}T00:00:00`;
}
