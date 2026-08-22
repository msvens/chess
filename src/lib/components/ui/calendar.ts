/**
 * Calendar arithmetic and locale formatting for `DatePicker`.
 *
 * Pure, so the month grids — the part with off-by-one risk around month and year
 * boundaries — can be tested directly.
 */
export interface CalendarDay {
	date: number;
	month: number;
	year: number;
	/** False for the leading/trailing days borrowed from the neighbouring months. */
	isCurrentMonth: boolean;
}

export function getDaysInMonth(year: number, month: number): number {
	// Day 0 of the next month is the last day of this one.
	return new Date(year, month + 1, 0).getDate();
}

/**
 * A fixed 6×7 grid for the month, padded with the neighbouring months' days.
 *
 * Always 42 cells so the popup doesn't change height as you page through months.
 */
export function getCalendarDays(year: number, month: number): CalendarDay[] {
	const days: CalendarDay[] = [];
	const firstDayOfWeek = new Date(year, month, 1).getDay();
	// JS weeks start on Sunday; Swedish calendars start on Monday.
	const offset = (firstDayOfWeek + 6) % 7;
	const daysInMonth = getDaysInMonth(year, month);
	const daysInPrevMonth = getDaysInMonth(year, month - 1);

	for (let i = offset - 1; i >= 0; i--) {
		const d = daysInPrevMonth - i;
		const m = month - 1;
		days.push({
			date: d,
			month: (m + 12) % 12,
			year: m < 0 ? year - 1 : year,
			isCurrentMonth: false
		});
	}

	for (let d = 1; d <= daysInMonth; d++) {
		days.push({ date: d, month, year, isCurrentMonth: true });
	}

	// Computed once: `days.length` grows inside the loop, so using it as the bound
	// would shrink the target as we fill.
	const remaining = 42 - days.length;
	for (let d = 1; d <= remaining; d++) {
		const m = month + 1;
		days.push({ date: d, month: m % 12, year: m > 11 ? year + 1 : year, isCurrentMonth: false });
	}

	return days;
}

export function toDateString(year: number, month: number, day: number): string {
	return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function toMonthString(year: number, month: number): string {
	return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** The trigger's text. Falls back to the raw value if it isn't parseable. */
export function formatDisplayDate(value: string, mode: 'date' | 'month', locale?: string): string {
	if (!value) return '';
	const [y, m, d] = value.split('-').map(Number);
	if (mode === 'month') {
		if (Number.isNaN(y) || Number.isNaN(m)) return value;
		return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(
			new Date(y, m - 1, 1)
		);
	}
	if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return value;
	return new Intl.DateTimeFormat(locale, {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	}).format(new Date(y, m - 1, d));
}

/** Monday-first weekday initials for the locale. */
export function getWeekdayHeaders(locale?: string): string[] {
	const formatter = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
	// 5 Jan 2026 is a Monday.
	return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2026, 0, 5 + i)));
}

export function getMonthNames(locale?: string): string[] {
	const formatter = new Intl.DateTimeFormat(locale, { month: 'short' });
	return Array.from({ length: 12 }, (_, i) => formatter.format(new Date(2026, i, 1)));
}

/** The month a value points at, for opening the popup in the right place. */
export function viewDateFor(value: string): Date {
	if (!value) return new Date();
	const [y, m] = value.split('-').map(Number);
	if (Number.isNaN(y)) return new Date();
	return new Date(y, (m || 1) - 1, 1);
}
