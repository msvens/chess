/**
 * The days a tournament is on the calendar, and which of its groups play on each.
 *
 * Two modes:
 * - Game days (`playedDays`): the SDK's `getTournamentPlayDays`, the same rule
 *   `getTournamentsToday` applies for today, so today's square and `/today`
 *   agree by construction. A weekly league sits on the evenings it plays; a
 *   long tournament also gets start and end markers on days it doesn't play.
 *   The rules are the SDK's; read them there rather than restating them here.
 * - Tournament dates (`datedDays`): the tournament's own start–end, as the
 *   calendar showed it before game days. Presentation, so it stays here.
 */
import {
	getTournamentPlayDays,
	isGrandPrix,
	LONG_TOURNAMENT_DAYS,
	parseLocalDate,
	type TournamentClassDto,
	type TournamentClassGroupDto,
	type TournamentDto
} from '$lib/api';
import { parseEventDays, toDayNumber } from './calendarLayout';

export type Group = TournamentClassGroupDto;

/** A day that is only a tournament's start or end, not a day of play. */
export type Marker = 'start' | 'end';

export interface CalendarEvent {
	tournament: TournamentDto;
	/** Day number → the groups listed that day; can be empty (a Grand Prix series). */
	days: Map<number, Group[]>;
	/** The days among `days` that are markers rather than days of play. */
	markers: Map<number, Marker>;
}

/** One tournament on one day, with the groups playing. */
export interface PlayedEntry {
	tournament: TournamentDto;
	groups: Group[];
	/** The day is only the tournament's start (a long tournament, a series). */
	starts?: boolean;
	/** The day is only the tournament's end. */
	ends?: boolean;
}

function allGroups(classes: TournamentClassDto[] | null | undefined): Group[] {
	return (classes ?? []).flatMap((c) => [...(c.groups ?? []), ...allGroups(c.subClasses)]);
}

/** Game days, by the SDK's rule. */
export function playedDays(tournament: TournamentDto): CalendarEvent {
	const days = new Map<number, Group[]>();
	const markers = new Map<number, Marker>();
	for (const { date, groups, marker } of getTournamentPlayDays(tournament)) {
		const day = toDayNumber(parseLocalDate(date));
		days.set(
			day,
			groups.map(({ group }) => group)
		);
		if (marker) markers.set(day, marker === 'starts' ? 'start' : 'end');
	}
	return { tournament, days, markers };
}

/**
 * The calendar's other mode, tournament dates: a tournament of up to
 * {@link LONG_TOURNAMENT_DAYS} days across all its dates; a longer one (and a
 * Grand Prix series) as a marker on its start day and another on its end day,
 * so a season-long league shows when it begins and when it finishes. Round
 * dates are not read; every group is listed on every day, so the popover still
 * lists them.
 */
export function datedDays(tournament: TournamentDto): CalendarEvent {
	const days = new Map<number, Group[]>();
	const markers = new Map<number, Marker>();
	const span = parseEventDays(tournament);
	if (!span) return { tournament, days, markers };

	const groups = allGroups(tournament.rootClasses);
	if (isGrandPrix(tournament.type) || span.end - span.start + 1 > LONG_TOURNAMENT_DAYS) {
		days.set(span.start, []);
		markers.set(span.start, 'start');
		if (span.end !== span.start) {
			days.set(span.end, []);
			markers.set(span.end, 'end');
		}
		return { tournament, days, markers };
	}
	for (let day = span.start; day <= span.end; day++) days.set(day, groups);
	return { tournament, days, markers };
}

/** Everything on a day, each tournament with its groups for that day. */
export function playedOn(events: CalendarEvent[], day: number): PlayedEntry[] {
	return events.flatMap(({ tournament, days, markers }) => {
		const groups = days.get(day);
		if (!groups) return [];
		const marker = markers.get(day);
		return [{ tournament, groups, starts: marker === 'start', ends: marker === 'end' }];
	});
}
