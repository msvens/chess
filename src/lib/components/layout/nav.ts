/**
 * The navbar's contents, as data.
 *
 * Ports `NavbarConfig.tsx`. Kept as a plain module rather than a component (the
 * pattern mphotos-svelte uses for its own nav table) so the structure and the
 * active-route rule can be unit-tested without rendering anything.
 *
 * It is a function rather than a constant because every label is translated and
 * the theme/language entries flip with current state — so it is rebuilt whenever
 * those change, which in Svelte means calling it inside a `$derived`.
 */
import {
	AcademicCap,
	BookOpen,
	BuildingOffice2,
	Calendar,
	Cog6Tooth,
	Moon,
	Sun,
	Trophy,
	User,
	UserGroup
} from 'svelte-hero-icons';
import type { Language } from '$lib/i18n';
import { getTranslation } from '$lib/translations';
import type { Theme } from '$lib/stores/theme.svelte';
import type { NavBrand, NavItem, NavLinkItem, NavDropdownItem } from './navTypes';

export const brand: NavBrand = {
	href: '/',
	lines: ['msvens', 'chess']
};

/**
 * Is `href` the section the current path is in?
 *
 * Matches the Next app: an exact hit, or a path one level below. The `+ '/'` is
 * what stops `/results` from also lighting up on `/resultsomething`.
 */
export function isActiveRoute(pathname: string, href: string): boolean {
	return pathname === href || pathname.startsWith(href + '/');
}

export function centerItems(language: Language): NavLinkItem[] {
	const t = getTranslation(language);
	return [
		{
			kind: 'link',
			id: 'calendar',
			href: '/calendar',
			icon: Calendar,
			label: t.navbar.navigation.calendar
		},
		{
			kind: 'link',
			id: 'results',
			href: '/results',
			icon: Trophy,
			label: t.navbar.navigation.results
		},
		{
			kind: 'link',
			id: 'players',
			href: '/players',
			icon: User,
			label: t.navbar.navigation.players
		},
		{
			kind: 'link',
			id: 'organizations',
			href: '/organizations',
			icon: BuildingOffice2,
			label: t.navbar.navigation.organizations
		},
		// Not translated: "Elo" is the same word in both languages.
		{ kind: 'link', id: 'elo', href: '/elo', icon: AcademicCap, label: 'Elo' }
	];
}

export function moreDropdown(
	language: Language,
	theme: Theme,
	onToggleTheme: () => void,
	onToggleLanguage: () => void
): NavDropdownItem {
	const t = getTranslation(language);
	return {
		kind: 'dropdown',
		id: 'more',
		icon: Cog6Tooth,
		label: t.navbar.more,
		items: [
			{
				kind: 'link',
				id: 'junior',
				href: '/junior',
				icon: UserGroup,
				label: t.navbar.navigation.junior
			},
			{
				kind: 'link',
				id: 'guide',
				href: '/guide',
				icon: BookOpen,
				label: t.navbar.navigation.guide
			},
			{ kind: 'divider' },
			{
				kind: 'action',
				id: 'theme',
				// Label and icon describe what you'd switch TO, not the current state.
				icon: theme === 'dark' ? Sun : Moon,
				label: theme === 'dark' ? t.navbar.lightMode : t.navbar.darkMode,
				onClick: onToggleTheme
			},
			{
				kind: 'action',
				id: 'language',
				label: language === 'en' ? '🇸🇪 Svenska' : '🇺🇸 English',
				onClick: onToggleLanguage
			}
		]
	};
}

export function rightItems(
	language: Language,
	theme: Theme,
	onToggleTheme: () => void,
	onToggleLanguage: () => void
): NavItem[] {
	return [moreDropdown(language, theme, onToggleTheme, onToggleLanguage)];
}
