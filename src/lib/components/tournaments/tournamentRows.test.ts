import { describe, expect, it } from 'vitest';
import type { TournamentDto } from '$lib/api';
import { formatDate, formatTimestamp, toTournamentRows } from './tournamentRows';

describe('formatDate', () => {
	it('formats to YYYY-MM-DD', () => {
		expect(formatDate('2026-08-21')).toBe('2026-08-21');
	});

	it('renders a missing or unparseable date as a dash', () => {
		expect(formatDate('')).toBe('-');
		expect(formatDate(null)).toBe('-');
		expect(formatDate(undefined)).toBe('-');
		expect(formatDate('not a date')).toBe('-');
	});
});

describe('formatTimestamp', () => {
	it('splits into date and time', () => {
		const out = formatTimestamp('2026-08-21T14:30:15');
		expect(out.date).toBe('2026-08-21');
		expect(out.time).toBe('14:30:15');
	});

	it('zero-pads the time', () => {
		expect(formatTimestamp('2026-08-21T09:05:03').time).toBe('09:05:03');
	});

	it('renders a missing timestamp as a dash with no time', () => {
		expect(formatTimestamp(undefined)).toEqual({ date: '-', time: '' });
		expect(formatTimestamp('')).toEqual({ date: '-', time: '' });
	});

	// The React version took the date from toISOString() (UTC) and the time from
	// toTimeString() (local). Between midnight and 02:00 Swedish time those
	// disagree, and the row showed yesterday's date beside this morning's time.
	// Both halves must come from the same clock.
	//
	// Only demonstrable in a non-UTC zone — hence TZ=Europe/Stockholm in the test
	// scripts. Without the pin this passed for the wrong reason in CI.
	it('takes date and time from the same clock', () => {
		const justAfterMidnight = new Date(2026, 7, 21, 0, 30, 0);
		const out = formatTimestamp(justAfterMidnight.toISOString());
		expect(out.date).toBe('2026-08-21');
		expect(out.time).toBe('00:30:00');
		// The mixed-clock version would have produced this date instead.
		expect(justAfterMidnight.toISOString().split('T')[0]).not.toBe(out.date);
	});
});

describe('toTournamentRows', () => {
	const organizer = (type: number, number: number) => `Org ${type}/${number}`;
	const tournament = (over: Partial<TournamentDto>) =>
		({ id: 1, name: 'Rilton Cup', orgType: 1, orgNumber: 42, ...over }) as TournamentDto;

	it('resolves the organizer through the supplied lookup', () => {
		const [row] = toTournamentRows([tournament({})], organizer);
		expect(row.club).toBe('Org 1/42');
	});

	it('shows a dash when there is no organizer to resolve', () => {
		const [row] = toTournamentRows([tournament({ orgNumber: 0 })], organizer);
		expect(row.club).toBe('-');
	});

	it('carries the id through for the row link', () => {
		const [row] = toTournamentRows([tournament({ id: 16642 })], organizer);
		expect(row.tournamentId).toBe(16642);
	});

	it('renders missing dates as dashes rather than Invalid Date', () => {
		const [row] = toTournamentRows([tournament({ start: '', end: '' })], organizer);
		expect(row.start).toBe('-');
		expect(row.end).toBe('-');
	});
});
