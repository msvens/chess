/**
 * How an event is described in words, wherever the calendar describes one.
 *
 * The React version copied `typeLabel` into four components and `formatRange`
 * into three, in two date formats — and the four copies did not agree on what an
 * unknown type should read as. One module, one answer.
 */
import { parseLocalDate, type TournamentDto } from '$lib/api';
import { formatApiDayRange } from '$lib/dateFormat';
import { getTournamentTypeKey } from '$lib/utils/tournamentFilters';

/** The `components.tournamentTypeFilter` block of a translation. */
type TypeLabels = Record<string, string>;

/**
 * The name of a tournament type, or an empty string when it has none.
 *
 * Three of the React copies returned `''` for an unknown type and the fourth
 * returned the raw number. Empty wins: every caller renders this into prose or
 * a definition list, where a bare `7` says nothing to a reader.
 */
export function typeLabel(type: number, labels: TypeLabels): string {
	const key = getTournamentTypeKey(type);
	return labels[key] ?? '';
}

/**
 * Whether the organiser's end date falls before the start.
 *
 * Rare but real: two of the 137 upcoming tournaments have it, with no
 * registration-deadline field set to explain it, so it reads as data entry.
 * `parseEventDays` in `calendarLayout` already collapses such an event to a
 * single day when drawing it, which is why the bar and the text used to
 * disagree — the text printed the range backwards.
 *
 * Callers use this to mark the event, not to correct it: the app has no way to
 * know which of the two dates is the wrong one, so it must not quietly pick.
 */
export function hasReversedDates(tournament: TournamentDto): boolean {
	if (!tournament.start || !tournament.end) return false;
	const start = parseLocalDate(tournament.start).getTime();
	const end = parseLocalDate(tournament.end).getTime();
	if (Number.isNaN(start) || Number.isNaN(end)) return false;
	return end < start;
}

/**
 * An event's dates, exactly as the organiser entered them.
 *
 * A single-day event reads as one date. A reversed range is *not* repaired —
 * see `hasReversedDates`; the caller marks it instead.
 */
export function formatEventRange(
	tournament: TournamentDto,
	locale: string,
	options?: { showYear?: boolean }
): string {
	return formatApiDayRange(tournament.start, tournament.end, locale, options);
}
