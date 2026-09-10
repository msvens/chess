import { beforeEach, describe, expect, it } from 'vitest';
import { initialDivision, initialYear, isDivision, saveDivision, saveYear } from './juniorPrefs';

describe('juniorPrefs', () => {
	beforeEach(() => localStorage.clear());

	it('opens on the open series until told otherwise', () => {
		expect(initialDivision()).toBe('open');
		saveDivision('girls');
		expect(initialDivision()).toBe('girls');
	});

	it('ignores a stored division that is not one', () => {
		localStorage.setItem('junior-jgp-division', 'boys');
		expect(initialDivision()).toBe('open');
		expect(isDivision('boys')).toBe(false);
	});

	it('opens on the newest season with nothing stored', () => {
		expect(initialYear([2026, 2025])).toBe(2026);
	});

	it('reopens the season last looked at', () => {
		saveYear(2025);
		expect(initialYear([2026, 2025])).toBe(2025);
	});

	it('falls back to the newest when that division lacks the stored season', () => {
		saveYear(2025);
		expect(initialYear([2026])).toBe(2026);
	});

	it('is null when a division has no seasons at all', () => {
		expect(initialYear([])).toBeNull();
	});

	it('ignores a stored year that is not a number', () => {
		localStorage.setItem('junior-jgp-year', 'last');
		expect(initialYear([2026])).toBe(2026);
	});
});
