import { describe, expect, it } from 'vitest';
import { formatApiDay, formatApiDayRange, formatDay, shortMonthName } from '$lib/dateFormat';

describe('a single date', () => {
	it('has no abbreviation dot in Swedish', () => {
		expect(formatDay(new Date(2026, 9, 1), 'sv-SE')).toBe('1 okt 2026');
	});

	it('keeps the comma in English', () => {
		expect(formatDay(new Date(2026, 9, 1), 'en-US')).toBe('Oct 1, 2026');
	});

	it('can leave out the year', () => {
		expect(formatDay(new Date(2026, 9, 1), 'sv-SE', { showYear: false })).toBe('1 okt');
	});

	it('reads an API date as local, so it cannot slip a day', () => {
		expect(formatApiDay('2026-01-01', 'sv-SE')).toBe('1 jan 2026');
	});

	it('shows what it was given when it cannot be read', () => {
		expect(formatApiDay('nonsense', 'sv-SE')).toBe('nonsense');
	});
});

describe('a month name', () => {
	it('has no abbreviation dot', () => {
		expect(shortMonthName(new Date(2026, 9, 1), 'sv-SE')).toBe('okt');
	});
});

describe('a date range', () => {
	it.each([
		['same month', '2026-10-01', '2026-10-11', '1–11 okt 2026', 'Oct 1–11, 2026'],
		['across months', '2026-09-25', '2026-10-05', '25 sep – 5 okt 2026', 'Sep 25 – Oct 5, 2026'],
		[
			'across years',
			'2025-12-29',
			'2026-01-04',
			'29 dec 2025 – 4 jan 2026',
			'Dec 29, 2025 – Jan 4, 2026'
		]
	])('%s', (_, start, end, swedish, english) => {
		expect(formatApiDayRange(start, end, 'sv-SE')).toBe(swedish);
		expect(formatApiDayRange(start, end, 'en-US')).toBe(english);
	});

	it('leaves out every year when asked to', () => {
		const noYear = { showYear: false };
		expect(formatApiDayRange('2026-10-01', '2026-10-11', 'sv-SE', noYear)).toBe('1–11 okt');
		expect(formatApiDayRange('2025-12-29', '2026-01-04', 'sv-SE', noYear)).toBe('29 dec – 4 jan');
	});

	it('says a single day once', () => {
		expect(formatApiDayRange('2026-10-01', '2026-10-01', 'sv-SE')).toBe('1 okt 2026');
		expect(formatApiDayRange('2026-10-01', undefined, 'sv-SE')).toBe('1 okt 2026');
	});

	it('prints a reversed range in full, as entered', () => {
		expect(formatApiDayRange('2026-10-11', '2026-10-01', 'sv-SE')).toBe('11 okt 2026 – 1 okt 2026');
	});

	it('shows what it was given when it cannot be read', () => {
		expect(formatApiDayRange('nonsense', 'nonsense', 'sv-SE')).toBe('nonsense');
		expect(formatApiDayRange('2026-10-01', 'nonsense', 'sv-SE')).toBe('2026-10-01 – nonsense');
	});
});
