/**
 * The calendar question the results page asks about a group.
 *
 * It is about *local* days, not instants, and the group's `end` is a plain
 * `yyyy-mm-dd` string with no timezone. Getting that wrong has already produced
 * three dated bugs in this codebase, so the comparison lives here with tests
 * rather than inline in a component.
 */
import { parseLocalDate } from '$lib/api';

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
