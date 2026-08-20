import { beforeEach, describe, expect, it } from 'vitest';
import { initLanguage, language } from './language.svelte';

describe('language store', () => {
	beforeEach(() => {
		localStorage.clear();
		initLanguage();
	});

	it('defaults to Swedish', () => {
		expect(language.current).toBe('sv');
	});

	it('persists an explicit choice', () => {
		language.set('en');
		expect(language.current).toBe('en');
		expect(localStorage.getItem('language')).toBe('en');
	});

	it('adopts the persisted choice on init', () => {
		localStorage.setItem('language', 'en');
		initLanguage();
		expect(language.current).toBe('en');
	});

	it('falls back to Swedish when the stored value is not a language', () => {
		localStorage.setItem('language', 'de');
		initLanguage();
		expect(language.current).toBe('sv');
	});

	it('toggles between the two languages', () => {
		language.toggle();
		expect(language.current).toBe('en');
		language.toggle();
		expect(language.current).toBe('sv');
	});
});
