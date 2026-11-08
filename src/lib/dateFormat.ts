/**
 * Dates as the app words them: `1 okt 2026`, `Oct 1, 2026`.
 *
 * `Intl` supplies the month names and the word order. Two things it cannot be
 * asked for are done here: Swedish short months come with an abbreviation dot
 * (`okt.`), and `formatRange` spaces its dash differently per locale and per
 * browser, so ranges are put together from single dates instead.
 */
import { parseLocalDate } from '$lib/api';

interface DayFormatOptions {
	/** Off where the year is obvious and space is short, like a week's cards. */
	showYear?: boolean;
}

function monthWithoutDot(part: Intl.DateTimeFormatPart): Intl.DateTimeFormatPart {
	return part.type === 'month' ? { ...part, value: part.value.replace(/\.$/, '') } : part;
}

function dayParts(
	date: Date,
	locale: string | undefined,
	showYear: boolean
): Intl.DateTimeFormatPart[] {
	return new Intl.DateTimeFormat(locale, {
		day: 'numeric',
		month: 'short',
		year: showYear ? 'numeric' : undefined
	})
		.formatToParts(date)
		.map(monthWithoutDot);
}

const joined = (parts: Intl.DateTimeFormatPart[]) => parts.map((part) => part.value).join('');

export function shortMonthName(date: Date, locale: string | undefined): string {
	return joined(
		new Intl.DateTimeFormat(locale, { month: 'short' }).formatToParts(date).map(monthWithoutDot)
	);
}

export function formatDay(
	date: Date,
	locale: string | undefined,
	{ showYear = true }: DayFormatOptions = {}
): string {
	return joined(dayParts(date, locale, showYear));
}

/**
 * The shared month or year is said once: `1–11 okt 2026`, `25 sep – 5 okt 2026`.
 *
 * A reversed range is printed in full and in the order given. It is bad data,
 * and collapsing it would read as nonsense (`11–1 okt`).
 */
export function formatDayRange(
	start: Date,
	end: Date,
	locale: string | undefined,
	{ showYear = true }: DayFormatOptions = {}
): string {
	const sameYear = start.getFullYear() === end.getFullYear();
	const sameMonth = sameYear && start.getMonth() === end.getMonth();
	if (sameMonth && start.getDate() === end.getDate()) {
		return formatDay(start, locale, { showYear });
	}

	const full = (date: Date) => formatDay(date, locale, { showYear });
	if (end < start || !sameYear) return `${full(start)} – ${full(end)}`;
	if (!sameMonth) return `${formatDay(start, locale, { showYear: false })} – ${full(end)}`;

	return joined(
		dayParts(end, locale, showYear).map((part) =>
			part.type === 'day' ? { ...part, value: `${start.getDate()}–${part.value}` } : part
		)
	);
}

/** A date from the API. Anything unparseable comes back as given. */
export function formatApiDay(value: string, locale: string | undefined): string {
	const date = parseLocalDate(value);
	return Number.isNaN(date.getTime()) ? value : formatDay(date, locale);
}

/** A date range from the API; a missing end means a single day. */
export function formatApiDayRange(
	start: string,
	end: string | null | undefined,
	locale: string | undefined,
	options: DayFormatOptions = {}
): string {
	const from = parseLocalDate(start);
	const to = parseLocalDate(end || start);
	if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
		return end && end !== start ? `${start} – ${end}` : start;
	}
	return formatDayRange(from, to, locale, options);
}
