import { beforeEach, describe, expect, it } from 'vitest';
import {
	getSavedTab,
	isOrganizationsTab,
	resolveInitialTab,
	setSavedTab
} from './organizationsPrefs';

describe('organizations tab preference', () => {
	beforeEach(() => localStorage.clear());

	it('narrows only the four real tabs', () => {
		for (const tab of ['clubs', 'map', 'districts', 'ssf']) {
			expect(isOrganizationsTab(tab)).toBe(true);
		}
		expect(isOrganizationsTab('players')).toBe(false);
		expect(isOrganizationsTab(null)).toBe(false);
		expect(isOrganizationsTab(undefined)).toBe(false);
		expect(isOrganizationsTab('')).toBe(false);
	});

	it('round-trips through storage', () => {
		expect(getSavedTab()).toBeNull();
		setSavedTab('districts');
		expect(getSavedTab()).toBe('districts');
	});

	it('ignores a stored value that is not a tab', () => {
		localStorage.setItem('organizations-active-tab', 'nonsense');
		expect(getSavedTab()).toBeNull();
	});

	describe('resolveInitialTab', () => {
		it('prefers an explicit ?tab= over the remembered one', () => {
			setSavedTab('ssf');
			expect(resolveInitialTab('districts')).toBe('districts');
		});

		it('falls back to the remembered tab', () => {
			setSavedTab('map');
			expect(resolveInitialTab(null)).toBe('map');
		});

		it('defaults to clubs with nothing to go on', () => {
			expect(resolveInitialTab(null)).toBe('clubs');
		});

		it('ignores a bogus ?tab= rather than showing nothing', () => {
			setSavedTab('ssf');
			expect(resolveInitialTab('bogus')).toBe('ssf');
		});
	});
});
