import { beforeEach, describe, expect, it } from 'vitest';
import {
	initialTab,
	initialView,
	isCalendarTab,
	isCalendarView,
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
