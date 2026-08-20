/**
 * Shape of the navbar's configuration. Ported from the Next app's
 * `components/navbar/types.ts`, which is the contract the whole nav renders from:
 * the bar is data-driven, so adding an item means editing `nav.ts`, not markup.
 *
 * The only change is the icon type — heroicons-for-React component types become
 * `IconSource` values from svelte-hero-icons.
 */
import type { IconSource } from 'svelte-hero-icons';

// --- Brand ---
export interface NavBrand {
	href: string;
	/** Rendered as stacked lines, e.g. ['msvens', 'chess']. */
	lines: string[];
	logo?: string;
}

// --- Items inside a dropdown panel ---
export interface DropdownLinkItem {
	kind: 'link';
	id: string;
	href: string;
	icon?: IconSource;
	label: string;
}

export interface DropdownToggleItem {
	kind: 'toggle';
	id: string;
	icon?: IconSource;
	label: string;
	isOn: boolean;
	onToggle: () => void;
}

export interface DropdownActionItem {
	kind: 'action';
	id: string;
	icon?: IconSource;
	label: string;
	isActive?: boolean;
	onClick: () => void;
}

export interface DropdownDivider {
	kind: 'divider';
}

export type DropdownMenuItem =
	DropdownLinkItem | DropdownToggleItem | DropdownActionItem | DropdownDivider;

// --- Top-level nav items ---
export interface NavLinkItem {
	kind: 'link';
	id: string;
	href: string;
	icon?: IconSource;
	label: string;
	title?: string;
}

export interface NavDropdownItem {
	kind: 'dropdown';
	id: string;
	icon?: IconSource;
	label: string;
	items: DropdownMenuItem[];
	/** Heading shown above this group when the drawer flattens it. */
	mobileLabel?: string;
}

export type NavItem = NavLinkItem | NavDropdownItem;

export type NavDisplay = 'icon' | 'text' | 'both';
