import { describe, expect, it, vi } from 'vitest';
import { Moon, Sun } from 'svelte-hero-icons';
import { brand, centerItems, iconActions, isActiveRoute, moreDropdown, rightItems } from './nav';

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

	it('lists the four primary sections in order', () => {
		// Elo moved under the guide, reached through More.
		expect(centerItems('sv').map((i) => i.href)).toEqual([
			'/calendar',
			'/results',
			'/players',
			'/organizations'
		]);
	});

	it('translates labels', () => {
		expect(centerItems('sv').map((i) => i.label)).not.toEqual(
			centerItems('en').map((i) => i.label)
		);
	});

	it('gives every item an icon and a stable id', () => {
		for (const item of centerItems('sv')) {
			expect(item.icon).toBeTruthy();
			expect(item.id).toBeTruthy();
		}
	});
});

describe('more dropdown', () => {
	it('holds the two secondary links', () => {
		// Theme and language moved out to their own buttons beside it.
		const items = moreDropdown('sv').items;
		expect(items.map((i) => (i.kind === 'divider' ? 'divider' : i.id))).toEqual([
			'junior',
			'guide'
		]);
	});

	it('is the only right-hand item', () => {
		const items = rightItems('sv');
		expect(items).toHaveLength(1);
		expect(items[0].id).toBe('more');
	});
});

describe('icon actions', () => {
	const noop = () => {};
	const byId = (actions: ReturnType<typeof iconActions>, id: string) =>
		actions.find((a) => a.id === id);

	it('puts the theme first, then the language', () => {
		expect(iconActions('sv', 'dark', noop, noop).map((a) => a.id)).toEqual(['theme', 'language']);
	});

	// Both advertise the destination, not the current state — a moon while
	// already dark would read as a status, not an action.
	it('offers the theme you would switch TO', () => {
		expect(byId(iconActions('en', 'dark', noop, noop), 'theme')).toMatchObject({
			icon: Sun,
			label: 'Light Mode'
		});
		expect(byId(iconActions('en', 'light', noop, noop), 'theme')).toMatchObject({
			icon: Moon,
			label: 'Dark Mode'
		});
		expect(byId(iconActions('sv', 'dark', noop, noop), 'theme')).toMatchObject({
			label: 'Ljust Läge'
		});
	});

	it('offers the language you would switch TO, as its flag', () => {
		expect(byId(iconActions('en', 'dark', noop, noop), 'language')).toMatchObject({
			emoji: '🇸🇪',
			label: 'Svenska'
		});
		expect(byId(iconActions('sv', 'dark', noop, noop), 'language')).toMatchObject({
			emoji: '🇬🇧',
			label: 'English'
		});
	});

	it('wires the handlers through', () => {
		const onTheme = vi.fn();
		const onLanguage = vi.fn();
		const actions = iconActions('sv', 'dark', onTheme, onLanguage);
		byId(actions, 'theme')?.onClick();
		byId(actions, 'language')?.onClick();
		expect(onTheme).toHaveBeenCalledOnce();
		expect(onLanguage).toHaveBeenCalledOnce();
	});
});
