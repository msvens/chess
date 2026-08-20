import { describe, expect, it } from 'vitest';
import { DEFAULT_LANGUAGE, isLanguage } from './i18n';

describe('i18n', () => {
	it('defaults to Swedish, as the app always has', () => {
		expect(DEFAULT_LANGUAGE).toBe('sv');
	});

	it('narrows only the two supported languages', () => {
		expect(isLanguage('sv')).toBe(true);
		expect(isLanguage('en')).toBe(true);
		// Guards the localStorage read: anything else must fall back to the default.
		expect(isLanguage('de')).toBe(false);
		expect(isLanguage(null)).toBe(false);
		expect(isLanguage(undefined)).toBe(false);
	});
});
