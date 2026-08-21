import { describe, it, expect } from 'vitest';
import { hasGroupEnded, isSingleDayToday, localIsoDate } from '../groupDates';

/** Local wall-clock, which is what every one of these is about. */
const at = (year: number, month: number, day: number, hour = 12) =>
	new Date(year, month - 1, day, hour);

describe('localIsoDate', () => {
	it('reads the local day, not the UTC one', () => {
		// 23:30 local on the 15th is already the 16th in UTC under Stockholm's
		// offset. `toISOString().slice(0, 10)` — the shape this replaces — would
		// name the wrong day for the last hour or two of every evening.
		expect(localIsoDate(at(2025, 1, 15, 23))).toBe('2025-01-15');
	});

	it('zero-pads month and day', () => {
		expect(localIsoDate(at(2025, 3, 2))).toBe('2025-03-02');
	});
});

describe('isSingleDayToday', () => {
	it('is true for a one-day group being played today', () => {
		expect(isSingleDayToday('2025-01-15', '2025-01-15', at(2025, 1, 15))).toBe(true);
	});

	it('is false for a one-day group on any other day', () => {
		expect(isSingleDayToday('2025-01-15', '2025-01-15', at(2025, 1, 14))).toBe(false);
		expect(isSingleDayToday('2025-01-15', '2025-01-15', at(2025, 1, 16))).toBe(false);
	});

	it('is false for a group spanning several days, even one running today', () => {
		expect(isSingleDayToday('2025-01-15', '2025-01-17', at(2025, 1, 15))).toBe(false);
	});

	it('is false without dates', () => {
		expect(isSingleDayToday(null, null, at(2025, 1, 15))).toBe(false);
		expect(isSingleDayToday('2025-01-15', null, at(2025, 1, 15))).toBe(false);
		expect(isSingleDayToday(undefined, undefined, at(2025, 1, 15))).toBe(false);
	});

	it('holds late in the evening, when UTC has already rolled over', () => {
		expect(isSingleDayToday('2025-01-15', '2025-01-15', at(2025, 1, 15, 23))).toBe(true);
	});
});

describe('hasGroupEnded', () => {
	it('is false on the last day itself, whatever the hour', () => {
		// The group is still being played; a late-evening visitor must not be told
		// its results were cancelled.
		expect(hasGroupEnded('2025-01-15', at(2025, 1, 15, 23))).toBe(false);
		expect(hasGroupEnded('2025-01-15', at(2025, 1, 15, 0))).toBe(false);
	});

	it('is true the day after', () => {
		expect(hasGroupEnded('2025-01-15', at(2025, 1, 16, 0))).toBe(true);
	});

	it('is false before it starts', () => {
		expect(hasGroupEnded('2025-01-15', at(2025, 1, 10))).toBe(false);
	});

	it('is false without an end date', () => {
		expect(hasGroupEnded(null, at(2025, 1, 15))).toBe(false);
		expect(hasGroupEnded(undefined, at(2025, 1, 15))).toBe(false);
		expect(hasGroupEnded('', at(2025, 1, 15))).toBe(false);
	});

	it('is false for an end date it cannot read', () => {
		expect(hasGroupEnded('not a date', at(2025, 1, 15))).toBe(false);
	});
});
