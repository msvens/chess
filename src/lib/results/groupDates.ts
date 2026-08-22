/**
 * The two calendar questions the results page asks about a group.
 *
 * Both are about *local* days, not instants, and the group's `start` / `end` are
 * plain `yyyy-mm-dd` strings with no timezone. Getting that wrong has already
 * produced three dated bugs in this codebase, so the comparisons live here with
 * tests rather than inline in a component.
 */
import { parseLocalDate } from '$lib/api';

/** `yyyy-mm-dd` for a Date, read in the local timezone. */
export function localIsoDate(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * True when the group runs on exactly one day and that day is today.
 *
 * This is what gates the link to schack.se's live view: it is worth offering
 * while a one-day event is actually being played, and noise otherwise.
 */
export function isSingleDayToday(
	start: string | null | undefined,
	end: string | null | undefined,
	now: Date
): boolean {
	if (!start || start !== end) return false;
	return localIsoDate(now) === start;
}

/**
 * True when the group's last day is in the past.
 *
 * Compared date-to-date: a group ending today has not ended, whatever the hour.
 * `parseLocalDate` reads the string as a local midnight, so this must too — the
 * React version built today's midnight by mutating a `Date`, which is the same
 * comparison written in a way that also tripped the reactivity lint.
 */
export function hasGroupEnded(end: string | null | undefined, now: Date): boolean {
	if (!end) return false;
	const endDate = parseLocalDate(end);
	if (Number.isNaN(endDate.getTime())) return false;
	const midnightToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	return midnightToday > endDate.getTime();
}
