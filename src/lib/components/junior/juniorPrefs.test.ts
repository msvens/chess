import { beforeEach, describe, expect, it } from 'vitest';
import { initialDivision, isDivision, saveDivision } from './juniorPrefs';

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
});
