import { describe, expect, it, vi } from 'vitest';
import { brand, centerItems, isActiveRoute, moreDropdown, rightItems } from './nav';

describe('isActiveRoute', () => {
	it('matches the section exactly', () => {
		expect(isActiveRoute('/results', '/results')).toBe(true);
	});

	it('matches a path below the section', () => {
		expect(isActiveRoute('/results/16642/12345', '/results')).toBe(true);
	});

	// The whole reason for the `+ '/'`: a plain startsWith would light up /results
	// while sitting on /resultsomething.
	it('does not match a different section sharing the prefix', () => {
		expect(isActiveRoute('/resultsomething', '/results')).toBe(false);
	});

	it('does not match an unrelated path', () => {
		expect(isActiveRoute('/players', '/results')).toBe(false);
	});

	it('matches the root only exactly', () => {
		expect(isActiveRoute('/', '/')).toBe(true);
		// '/' + '/' is '//', which no real path starts with, so other pages stay inactive.
		expect(isActiveRoute('/results', '/')).toBe(false);
	});
});

describe('nav structure', () => {
	it('brands to the root with the stacked wordmark', () => {
		expect(brand.href).toBe('/');
		expect(brand.lines).toEqual(['msvens', 'chess']);
	});

	it('lists the five primary sections in order', () => {
		expect(centerItems('sv').map((i) => i.href)).toEqual([
			'/calendar',
			'/results',
			'/players',
			'/organizations',
			'/elo'
		]);
	});

	it('translates labels, except Elo which is the same word in both', () => {
		const sv = centerItems('sv');
		const en = centerItems('en');
		expect(sv.map((i) => i.label)).not.toEqual(en.map((i) => i.label));
		expect(sv.at(-1)!.label).toBe('Elo');
		expect(en.at(-1)!.label).toBe('Elo');
	});

	it('gives every item an icon and a stable id', () => {
		for (const item of centerItems('sv')) {
			expect(item.icon).toBeTruthy();
			expect(item.id).toBeTruthy();
		}
	});
});

describe('more dropdown', () => {
	const noop = () => {};

	it('holds the two secondary links, a divider, then the two toggles', () => {
		const items = moreDropdown('sv', 'dark', noop, noop).items;
		expect(items.map((i) => (i.kind === 'divider' ? 'divider' : i.id))).toEqual([
			'junior',
			'guide',
			'divider',
			'theme',
			'language'
		]);
	});

	// Both toggles advertise the destination, not the current state — showing
	// "Dark mode" while already dark would read as a status, not an action.
	it('offers the theme you would switch TO', () => {
		const dark = moreDropdown('en', 'dark', noop, noop).items.find(
			(i) => 'id' in i && i.id === 'theme'
		);
		const light = moreDropdown('en', 'light', noop, noop).items.find(
			(i) => 'id' in i && i.id === 'theme'
		);
		expect(dark).toMatchObject({ label: 'Light Mode' });
		expect(light).toMatchObject({ label: 'Dark Mode' });
	});

	it('translates the theme label too', () => {
		const sv = moreDropdown('sv', 'dark', noop, noop).items.find(
			(i) => 'id' in i && i.id === 'theme'
		);
		expect(sv).toMatchObject({ label: 'Ljust Läge' });
	});

	it('offers the language you would switch TO', () => {
		const fromEn = moreDropdown('en', 'dark', noop, noop).items.find(
			(i) => 'id' in i && i.id === 'language'
		);
		const fromSv = moreDropdown('sv', 'dark', noop, noop).items.find(
			(i) => 'id' in i && i.id === 'language'
		);
		expect(fromEn).toMatchObject({ label: '🇸🇪 Svenska' });
		expect(fromSv).toMatchObject({ label: '🇺🇸 English' });
	});

	it('wires the handlers through', () => {
		const onTheme = vi.fn();
		const onLanguage = vi.fn();
		const items = moreDropdown('sv', 'dark', onTheme, onLanguage).items;
		const theme = items.find((i) => 'id' in i && i.id === 'theme');
		const language = items.find((i) => 'id' in i && i.id === 'language');
		if (theme?.kind === 'action') theme.onClick();
		if (language?.kind === 'action') language.onClick();
		expect(onTheme).toHaveBeenCalledOnce();
		expect(onLanguage).toHaveBeenCalledOnce();
	});

	it('is the only right-hand item', () => {
		const items = rightItems('sv', 'dark', noop, noop);
		expect(items).toHaveLength(1);
		expect(items[0].id).toBe('more');
	});
});
