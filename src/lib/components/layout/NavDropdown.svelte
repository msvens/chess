<script lang="ts">
	/**
	 * A top-level dropdown in the bar. Ports `navbar/NavDropdown.tsx`.
	 *
	 * The panel stays mounted and is hidden with opacity + pointer-events rather than
	 * `{#if}`, which is what gives it the fade/slide the Next version had.
	 *
	 * Dismissal is two attachments instead of the original's two `useEffect`s —
	 * mousedown outside, and Escape. They stay attached and check `open` in the
	 * callback, rather than attaching conditionally: there is one dropdown in the
	 * app, so two idle document listeners cost nothing, and the alternative reads
	 * as a puzzle.
	 */
	import { Icon } from 'svelte-hero-icons';
	import { clickOutside } from '$lib/attachments/clickOutside';
	import { escapeKey } from '$lib/attachments/escapeKey';
	import DropdownMenuItemRow from './DropdownMenuItem.svelte';
	import type { NavDisplay, NavDropdownItem } from './navTypes';

	interface NavDropdownProps {
		item: NavDropdownItem;
		display?: NavDisplay;
	}

	let { item, display = 'text' }: NavDropdownProps = $props();

	let open = $state(false);

	let showIcon = $derived((display === 'icon' || display === 'both') && Boolean(item.icon));
	let showLabel = $derived(display === 'text' || display === 'both' || !item.icon);
</script>

<div
	class="relative"
	{@attach clickOutside(() => (open = false))}
	{@attach escapeKey(() => (open = false))}
>
	<button
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-haspopup="true"
		class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
	>
		{#if showIcon && item.icon}
			<Icon src={item.icon} class="h-5 w-5" aria-hidden="true" />
		{/if}
		{#if showLabel}
			<span>{item.label}</span>
		{/if}
	</button>

	<div
		class="absolute right-0 mt-2 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg transition-all duration-150 dark:border-gray-700 dark:bg-dark-bg {open
			? 'translate-y-0 opacity-100'
			: 'pointer-events-none -translate-y-2 opacity-0'}"
	>
		{#each item.items as menuItem, i (menuItem.kind === 'divider' ? `divider-${i}` : menuItem.id)}
			<DropdownMenuItemRow item={menuItem} />
		{/each}
	</div>
</div>
