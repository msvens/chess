/**
 * The navbar's contents, as data.
 *
 * Ports `NavbarConfig.tsx`. Kept as a plain module rather than a component (the
 * pattern mphotos-svelte uses for its own nav table) so the structure and the
 * active-route rule can be unit-tested without rendering anything.
 *
 * It is a function rather than a constant because every label is translated and
 * the theme/language buttons flip with current state — so it is rebuilt whenever
 * those change, which in Svelte means calling it inside a `$derived`.
 */
import {
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
import type { NavBrand, NavDropdownItem, NavIconAction, NavItem, NavLinkItem } from './navTypes';

export const brand: NavBrand = {
	href: '/',
	lines: ['msvens', 'chess'],
	logo: { light: '/logo-light.png', dark: '/logo-dark.png' }
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
		}
	];
}

export function moreDropdown(language: Language): NavDropdownItem {
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
			}
		]
	};
}

export function rightItems(language: Language): NavItem[] {
	return [moreDropdown(language)];
}

/**
 * The theme and language buttons beside "More". Each shows what you would
 * switch TO, not the current state: the sun in dark mode, the Swedish flag on
 * the English site.
 */
export function iconActions(
	language: Language,
	theme: Theme,
	onToggleTheme: () => void,
	onToggleLanguage: () => void
): NavIconAction[] {
	const t = getTranslation(language);
	return [
		{
			id: 'theme',
			icon: theme === 'dark' ? Sun : Moon,
			label: theme === 'dark' ? t.navbar.lightMode : t.navbar.darkMode,
			onClick: onToggleTheme
		},
		{
			id: 'language',
			emoji: language === 'en' ? '🇸🇪' : '🇬🇧',
			label: language === 'en' ? t.navbar.language.swedish : t.navbar.language.english,
			onClick: onToggleLanguage
		}
	];
}
