import { describe, expect, it } from 'vitest';
import {
	formatDisplayDate,
	getCalendarDays,
	getDaysInMonth,
	getMonthNames,
	getWeekdayHeaders,
	toDateString,
	toMonthString,
	viewDateFor
} from './datePickerLogic';

describe('getDaysInMonth', () => {
	it('knows the ordinary months', () => {
		expect(getDaysInMonth(2026, 0)).toBe(31);
		expect(getDaysInMonth(2026, 3)).toBe(30);
	});

	it('knows February in common and leap years', () => {
		expect(getDaysInMonth(2026, 1)).toBe(28);
		expect(getDaysInMonth(2028, 1)).toBe(29);
		// 2100 is not a leap year despite being divisible by 4.
		expect(getDaysInMonth(2100, 1)).toBe(28);
	});
});

describe('getCalendarDays', () => {
	it('always returns a full 6x7 grid, so the popup never changes height', () => {
		for (let month = 0; month < 12; month++) {
			expect(getCalendarDays(2026, month)).toHaveLength(42);
		}
	});

	it('starts the week on Monday, as Swedish calendars do', () => {
		// 1 Aug 2026 is a Saturday, so the grid opens on Mon 27 July.
		const days = getCalendarDays(2026, 7);
		expect(days[0]).toMatchObject({ date: 27, month: 6, year: 2026, isCurrentMonth: false });
	});

	it('marks only the target month as current', () => {
		const days = getCalendarDays(2026, 7);
		const current = days.filter((d) => d.isCurrentMonth);
		expect(current).toHaveLength(31);
		expect(current[0].date).toBe(1);
		expect(current.at(-1)!.date).toBe(31);
	});

	it('rolls the leading days back across a year boundary', () => {
		// January 2027 — the leading days belong to December 2026.
		const days = getCalendarDays(2027, 0);
		const leading = days.filter((d) => !d.isCurrentMonth && d.month === 11);
		expect(leading.every((d) => d.year === 2026)).toBe(true);
	});

	it('rolls the trailing days forward across a year boundary', () => {
		const days = getCalendarDays(2026, 11);
		const trailing = days.filter((d) => !d.isCurrentMonth && d.month === 0);
		expect(trailing.every((d) => d.year === 2027)).toBe(true);
	});

	it('produces a continuous run of dates with no gaps or repeats', () => {
		for (const month of [0, 1, 6, 11]) {
			const days = getCalendarDays(2026, month);
			for (let i = 1; i < days.length; i++) {
				const prev = new Date(days[i - 1].year, days[i - 1].month, days[i - 1].date);
				const cur = new Date(days[i].year, days[i].month, days[i].date);
				expect((cur.getTime() - prev.getTime()) / 86_400_000, `gap at ${i} in month ${month}`).toBe(
					1
				);
			}
		}
	});
});

describe('string helpers', () => {
	it('zero-pads', () => {
		expect(toDateString(2026, 0, 5)).toBe('2026-01-05');
		expect(toMonthString(2026, 0)).toBe('2026-01');
	});

	it('converts the zero-based month to a human one', () => {
		expect(toDateString(2026, 11, 25)).toBe('2026-12-25');
	});
});

describe('formatDisplayDate', () => {
	it('formats a day in the given locale', () => {
		expect(formatDisplayDate('2026-08-21', 'date', 'sv')).toContain('2026');
	});

	it('formats a month without a day', () => {
		const out = formatDisplayDate('2026-08', 'month', 'en');
		expect(out).toContain('August');
		expect(out).not.toMatch(/\b\d{1,2}\b(?!\d)(?!.*2026)/);
	});

	it('differs between locales', () => {
		expect(formatDisplayDate('2026-08', 'month', 'sv')).not.toBe(
			formatDisplayDate('2026-08', 'month', 'en')
		);
	});

	it('returns the raw value rather than "Invalid Date" when it cannot parse', () => {
		expect(formatDisplayDate('nonsense', 'date', 'sv')).toBe('nonsense');
	});

	it('returns empty for an empty value', () => {
		expect(formatDisplayDate('', 'date', 'sv')).toBe('');
	});
});

describe('locale lists', () => {
	it('gives seven weekday headers starting on Monday', () => {
		const sv = getWeekdayHeaders('sv');
		expect(sv).toHaveLength(7);
		// Swedish narrow weekdays start Monday: m, t, o, t, f, l, s
		expect(sv[0].toLowerCase()).toBe('m');
		expect(sv[6].toLowerCase()).toBe('s');
	});

	it('gives twelve month names, translated', () => {
		expect(getMonthNames('sv')).toHaveLength(12);
		expect(getMonthNames('sv')).not.toEqual(getMonthNames('en'));
	});
});

describe('viewDateFor', () => {
	it('opens on the month the value names', () => {
		const d = viewDateFor('2026-08-21');
		expect(d.getFullYear()).toBe(2026);
		expect(d.getMonth()).toBe(7);
		expect(d.getDate()).toBe(1);
	});

	it('handles a month-only value', () => {
		expect(viewDateFor('2026-03').getMonth()).toBe(2);
	});

	it('falls back to today for an empty or unparseable value', () => {
		expect(viewDateFor('').getFullYear()).toBe(new Date().getFullYear());
		expect(viewDateFor('nonsense').getFullYear()).toBe(new Date().getFullYear());
	});
});
