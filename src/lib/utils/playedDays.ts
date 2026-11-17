/**
 * The days a tournament is played, and which of its groups play on each.
 *
 * Read straight from what the coming list returns: every group carries its
 * rounds with a `roundDate`, so a weekly league is placed on the evenings it
 * plays rather than only on the day it started. Both the calendar and `/today`
 * read this, which is what keeps today's square and `/today` in agreement.
 *
 * The rules, in order:
 * 1. A group plays on each day it has a round dated. A round outside the
 *    group's own dates, or the tournament's, is an organiser's typo and is
 *    ignored — unless that range is itself reversed, when it says nothing.
 * 2. A group with no usable round dates plays every day of its own range, or
 *    of the tournament's when it has none; so does a tournament with no groups.
 * 3. That fallback over more than {@link LONG_EVENT_THRESHOLD} days, and a
 *    Grand Prix series always (its round dates don't reflect play), shows on
 *    the start day only, as a marker.
 */
import {
	isGrandPrix,
	parseLocalDate,
	type TournamentClassDto,
	type TournamentClassGroupDto,
	type TournamentDto
} from '$lib/api';
import { parseEventDays, toDayNumber } from './calendarLayout';

/** A date range longer than this, with no round dates, shows on its start day only. */
export const LONG_EVENT_THRESHOLD = 7;

export type Group = TournamentClassGroupDto;

export interface CalendarEvent {
	tournament: TournamentDto;
	/** Day number → the groups playing that day; empty when no group can be named. */
	days: Map<number, Group[]>;
	/** Placed on its start day only, so that day is not a claim of play. */
	marker: boolean;
}

/** One tournament on one day, with the groups playing. */
export interface PlayedEntry {
	tournament: TournamentDto;
	groups: Group[];
}

interface DayRange {
	start: number;
	end: number;
}

function dayOf(value: string | null | undefined): number | null {
	if (!value) return null;
	const day = toDayNumber(parseLocalDate(value.slice(0, 10)));
	return Number.isNaN(day) ? null : day;
}

/** A range to check dates against, or null when it is missing or reversed. */
function validRange(start: string | null | undefined, end: string | null | undefined) {
	const from = dayOf(start);
	const to = dayOf(end);
	return from !== null && to !== null && from <= to ? { start: from, end: to } : null;
}

const inside = (day: number, range: DayRange | null) =>
	range === null || (day >= range.start && day <= range.end);

function allGroups(classes: TournamentClassDto[] | null | undefined): Group[] {
	return (classes ?? []).flatMap((c) => [...(c.groups ?? []), ...allGroups(c.subClasses)]);
}

export function playedDays(tournament: TournamentDto): CalendarEvent {
	const days = new Map<number, Group[]>();
	const add = (day: number, group?: Group) => {
		const groups = days.get(day) ?? [];
		if (group && !groups.includes(group)) groups.push(group);
		days.set(day, groups);
	};

	const span = parseEventDays(tournament);
	if (isGrandPrix(tournament.type)) {
		if (span) add(span.start);
		return { tournament, days, marker: true };
	}

	const tournamentRange = validRange(tournament.start, tournament.end);
	const groups = allGroups(tournament.rootClasses);
	const undated: Group[] = [];
	// Set by anything that is a real claim of play: a round, or a short range.
	let played = false;

	for (const group of groups) {
		const groupRange = validRange(group.start, group.end);
		const roundDays = (group.tournamentRounds ?? [])
			.map((round) => dayOf(round.roundDate))
			.filter(
				(day): day is number =>
					day !== null && inside(day, groupRange) && inside(day, tournamentRange)
			);
		if (roundDays.length === 0) {
			undated.push(group);
			continue;
		}
		for (const day of roundDays) add(day, group);
		played = true;
	}

	const fallbacks: { range: DayRange | null; group?: Group }[] =
		groups.length === 0
			? [{ range: span }]
			: undated.map((group) => ({ range: validRange(group.start, group.end) ?? span, group }));

	for (const { range, group } of fallbacks) {
		if (!range) continue;
		if (range.end - range.start + 1 > LONG_EVENT_THRESHOLD) {
			add(range.start, group);
			continue;
		}
		for (let day = range.start; day <= range.end; day++) add(day, group);
		played = true;
	}

	return { tournament, days, marker: !played && days.size > 0 };
}

/**
 * The calendar's other mode, as it worked before game days: a tournament of up
 * to {@link LONG_EVENT_THRESHOLD} days across all its dates, a longer one (and
 * a Grand Prix series) as a marker on its start day. Round dates are not read;
 * every group is listed on every day, so a click still goes straight to the
 * only group, or lists them.
 */
export function datedDays(tournament: TournamentDto): CalendarEvent {
	const days = new Map<number, Group[]>();
	const span = parseEventDays(tournament);
	if (!span) return { tournament, days, marker: false };

	const groups = allGroups(tournament.rootClasses);
	if (isGrandPrix(tournament.type) || span.end - span.start + 1 > LONG_EVENT_THRESHOLD) {
		days.set(span.start, []);
		return { tournament, days, marker: true };
	}
	for (let day = span.start; day <= span.end; day++) days.set(day, groups);
	return { tournament, days, marker: false };
}

/** Everything played on a day, each tournament with its groups for that day. */
export function playedOn(events: CalendarEvent[], day: number): PlayedEntry[] {
	return events.flatMap(({ tournament, days }) => {
		const groups = days.get(day);
		return groups ? [{ tournament, groups }] : [];
	});
}
