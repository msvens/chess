import { beforeEach, describe, expect, it } from 'vitest';
import { initTheme, theme } from './theme.svelte';

describe('theme store', () => {
	beforeEach(() => {
		localStorage.clear();
		initTheme();
	});

	it('defaults to dark, matching the Next app', () => {
		expect(theme.current).toBe('dark');
	});

	it('persists an explicit choice', () => {
		theme.set('light');
		expect(theme.current).toBe('light');
		expect(localStorage.getItem('theme')).toBe('light');
	});

	it('adopts the persisted choice on init', () => {
		localStorage.setItem('theme', 'light');
		initTheme();
		expect(theme.current).toBe('light');
	});

	it('falls back to dark when the stored value is junk', () => {
		localStorage.setItem('theme', 'chartreuse');
		initTheme();
		expect(theme.current).toBe('dark');
	});

	it('toggles between the two themes', () => {
		expect(theme.current).toBe('dark');
		theme.toggle();
		expect(theme.current).toBe('light');
		theme.toggle();
		expect(theme.current).toBe('dark');
	});
});
