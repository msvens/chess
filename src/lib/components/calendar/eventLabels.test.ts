import { describe, expect, it } from 'vitest';
import type { TournamentDto } from '$lib/api';
import {
	formatEventRange,
	hasReversedDates,
	longDateFormat,
	shortDateFormat,
	typeLabel
} from './eventLabels';

const ALLSVENSKAN = 2;
const INDIVIDUAL = 3;

const labels = { allsvenskan: 'Allsvenskan', individual: 'Individuell', grandPrix: 'Grand Prix' };

const event = (start: string, end?: string): TournamentDto =>
	({ id: 1, name: 'Rilton Cup', start, end }) as TournamentDto;

describe('naming a tournament type', () => {
	it('reads the label off the type', () => {
		expect(typeLabel(ALLSVENSKAN, labels)).toBe('Allsvenskan');
		expect(typeLabel(INDIVIDUAL, labels)).toBe('Individuell');
	});

	it('says nothing for a type it has no name for', () => {
		// Three of the four React copies returned '' here and the fourth returned
		// the raw number. A bare "42" in a definition list says nothing to a reader.
		expect(typeLabel(42, labels)).toBe('');
	});

	it('says nothing when the label is missing from the set given', () => {
		expect(typeLabel(INDIVIDUAL, { allsvenskan: 'Allsvenskan' })).toBe('');
	});
});

describe('spotting an end date before the start', () => {
	it('finds the real ones', () => {
		// LASK OPEN 2026 and Snabbschack 1 Hösten 2026, as the API serves them.
		expect(hasReversedDates(event('2026-09-08', '2026-07-31'))).toBe(true);
		expect(hasReversedDates(event('2026-09-02', '2026-08-05'))).toBe(true);
	});

	it('leaves an ordinary range alone', () => {
		expect(hasReversedDates(event('2026-09-01', '2026-09-05'))).toBe(false);
	});

	it('does not flag a single-day event', () => {
		expect(hasReversedDates(event('2026-09-01', '2026-09-01'))).toBe(false);
	});

	it('does not flag an event with no end date', () => {
		expect(hasReversedDates(event('2026-09-01'))).toBe(false);
	});

	it('does not flag dates it cannot read', () => {
		// An unreadable date is a different problem, and not one to shout about.
		expect(hasReversedDates(event('nonsense', '2026-09-01'))).toBe(false);
		expect(hasReversedDates(event('2026-09-01', 'nonsense'))).toBe(false);
	});

	it('reads the dates as local, so a timezone cannot invent a reversal', () => {
		expect(hasReversedDates(event('2026-01-01', '2026-01-01'))).toBe(false);
	});
});

describe('writing out an event’s dates', () => {
	const long = longDateFormat('sv-SE');
	const short = shortDateFormat('sv-SE');

	it('says one date for a single-day event', () => {
		expect(formatEventRange(event('2026-09-01', '2026-09-01'), long)).toBe('1 sep. 2026');
	});

	it('says one date when there is no end at all', () => {
		expect(formatEventRange(event('2026-09-01'), long)).toBe('1 sep. 2026');
	});

	it('says both for a range', () => {
		expect(formatEventRange(event('2026-09-01', '2026-09-05'), long)).toBe(
			'1 sep. 2026 – 5 sep. 2026'
		);
	});

	it('drops the year in the short format, for the week cards', () => {
		expect(formatEventRange(event('2026-09-01', '2026-09-05'), short)).toBe('1 sep. – 5 sep.');
	});

	it('prints a reversed range exactly as entered rather than repairing it', () => {
		// The app cannot know which of the two dates is wrong, so it must not pick.
		// `hasReversedDates` is what drives the marker beside this.
		expect(formatEventRange(event('2026-09-08', '2026-07-31'), long)).toBe(
			'8 sep. 2026 – 31 juli 2026'
		);
	});

	it('reads dates as local — a UTC parse slips a day west of Greenwich', () => {
		expect(formatEventRange(event('2026-01-01', '2026-01-01'), long)).toBe('1 jan. 2026');
	});
});
