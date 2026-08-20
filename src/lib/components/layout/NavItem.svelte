<script lang="ts">
	/**
	 * One top-level link in the bar. Ports `navbar/NavItem.tsx`.
	 *
	 * `display` decides whether the icon, the label, or both are shown; the label is
	 * always present to screen readers, so an icon-only bar stays navigable.
	 */
	import { page } from '$app/state';
	import { Icon } from 'svelte-hero-icons';
	import Link from '$lib/components/ui/Link.svelte';
	import { isActiveRoute } from './nav';
	import type { NavDisplay, NavLinkItem } from './navTypes';

	interface NavItemProps {
		item: NavLinkItem;
		display?: NavDisplay;
	}

	let { item, display = 'text' }: NavItemProps = $props();

	let active = $derived(isActiveRoute(page.url.pathname, item.href));
	let showIcon = $derived((display === 'icon' || display === 'both') && Boolean(item.icon));
	// An icon-only item with no icon would render nothing, so fall back to the label.
	let showLabel = $derived(display === 'text' || display === 'both' || !item.icon);
</script>

<Link
	href={item.href}
	color="inherit"
	underline="never"
	title={item.title ?? item.label}
	class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 {active
		? 'text-gray-900 dark:text-gray-200'
		: 'text-gray-600 dark:text-gray-400'}"
>
	{#if showIcon && item.icon}
		<Icon src={item.icon} class="h-5 w-5" aria-hidden="true" />
	{/if}
	{#if showLabel}
		<span>{item.label}</span>
	{/if}
	<span class="sr-only">{item.label}</span>
</Link>
