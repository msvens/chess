import { beforeEach, describe, expect, it } from 'vitest';
import {
	initialAnchor,
	initialTab,
	initialView,
	isCalendarTab,
	isCalendarView,
	saveAnchor,
	saveTab,
	saveView
} from './calendarPrefs';

beforeEach(() => localStorage.clear());

describe('the remembered tab', () => {
	it('opens on the calendar when nothing is stored', () => {
		expect(initialTab()).toBe('calendar');
	});

	it('remembers the last one used', () => {
		saveTab('map');
		expect(initialTab()).toBe('map');
	});

	it('ignores a stored value that is not a tab', () => {
		// A stale key from an older build must not select a tab that no longer
		// exists — the page would render nothing.
		localStorage.setItem('calendar-active-tab', 'agenda');
		expect(initialTab()).toBe('calendar');
	});
});

describe('the remembered view', () => {
	it('opens on the month when nothing is stored', () => {
		expect(initialView()).toBe('month');
	});

	it('remembers the week view', () => {
		saveView('week');
		expect(initialView()).toBe('week');
	});

	it('ignores a stored value that is not a view', () => {
		localStorage.setItem('calendar-view-mode', 'year');
		expect(initialView()).toBe('month');
	});
});

describe('the remembered period', () => {
	it('starts at today when nothing is stored', () => {
		const today = new Date();
		const anchor = initialAnchor();
		expect(anchor.getFullYear()).toBe(today.getFullYear());
		expect(anchor.getMonth()).toBe(today.getMonth());
		expect(anchor.getDate()).toBe(today.getDate());
	});

	it('stores a day, not a moment', () => {
		// A timestamp would drift; the key must mean the same calendar day when it
		// is read back.
		saveAnchor(new Date(2026, 8, 8, 23, 45));
		expect(localStorage.getItem('calendar-anchor')).toBe('2026-09-08');
	});

	it('pads the month and day', () => {
		saveAnchor(new Date(2026, 0, 3));
		expect(localStorage.getItem('calendar-anchor')).toBe('2026-01-03');
	});

	it('reads the day back as local midnight', () => {
		// `new Date('2026-09-08')` is UTC midnight, which reads as the 7th west of
		// Greenwich. `parseLocalDate` is the app's rule.
		saveAnchor(new Date(2026, 8, 8));
		const anchor = initialAnchor();
		expect(anchor.getFullYear()).toBe(2026);
		expect(anchor.getMonth()).toBe(8);
		expect(anchor.getDate()).toBe(8);
	});

	it('falls back to today when the stored key is malformed', () => {
		localStorage.setItem('calendar-anchor', 'last-tuesday');
		expect(initialAnchor().getFullYear()).toBe(new Date().getFullYear());
	});

	it('rolls an out-of-range key over rather than rejecting it', () => {
		// `2026-13-45` matches the shape, so it is parsed — and JS rolls month 13
		// day 45 forward to Feb 2027 instead of failing. Only reachable by editing
		// storage by hand, since `saveAnchor` never writes such a key, so this
		// pins the behaviour rather than guarding against it.
		localStorage.setItem('calendar-anchor', '2026-13-45');
		const anchor = initialAnchor();
		expect(anchor.getFullYear()).toBe(2027);
		expect(anchor.getMonth()).toBe(1);
	});
});

describe('the guards', () => {
	it('recognises exactly the three tabs', () => {
		expect(['calendar', 'list', 'map'].every(isCalendarTab)).toBe(true);
		expect(isCalendarTab('agenda')).toBe(false);
		expect(isCalendarTab(null)).toBe(false);
		expect(isCalendarTab('')).toBe(false);
	});

	it('recognises exactly the two views', () => {
		expect(['week', 'month'].every(isCalendarView)).toBe(true);
		expect(isCalendarView('day')).toBe(false);
		expect(isCalendarView(null)).toBe(false);
	});
});
