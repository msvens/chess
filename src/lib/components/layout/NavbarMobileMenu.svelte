<script lang="ts">
	/**
	 * The mobile drawer. Ports `navbar/NavbarMobileMenu.tsx`.
	 *
	 * Dropdowns are flattened here rather than nested: a drawer is already a list, so
	 * a "More" submenu inside it would be a second level for no reason. Each group is
	 * separated by a rule, with an optional heading.
	 *
	 * Every entry closes the drawer, including the toggles — otherwise the theme
	 * flips behind an open panel and it is unclear anything happened.
	 */
	import { page } from '$app/state';
	import { Icon } from 'svelte-hero-icons';
	import Link from '$lib/components/ui/Link.svelte';
	import { isActiveRoute } from './nav';
	import type { DropdownMenuItem, NavItem } from './navTypes';

	interface NavbarMobileMenuProps {
		open: boolean;
		onClose: () => void;
		items: NavItem[];
	}

	let { open, onClose, items }: NavbarMobileMenuProps = $props();

	const row = 'flex items-center px-4 py-3 transition-colors';
	const idle = 'text-gray-600 dark:text-gray-400';
	const activeText = 'text-gray-900 dark:text-gray-200';

	function runAndClose(action: () => void) {
		action();
		onClose();
	}

	function itemKey(item: DropdownMenuItem, i: number) {
		return item.kind === 'divider' ? `divider-${i}` : item.id;
	}
</script>

<!-- Scrim. A plain div would not be reachable by keyboard, so it is a button with
     an accessible name; Escape is handled by the drawer's own controls. -->
<button
	aria-label="Close menu"
	class="fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 {open
		? 'opacity-100'
		: 'pointer-events-none opacity-0'}"
	onclick={onClose}
></button>

<div
	class="fixed top-12 right-0 z-50 h-[calc(100vh-48px)] w-56 border-l border-gray-200 bg-white shadow-lg transition-all duration-200 ease-in-out md:hidden dark:border-gray-700 dark:bg-dark-bg {open
		? 'translate-x-0 opacity-100'
		: 'pointer-events-none translate-x-4 opacity-0'}"
>
	<div class="h-full overflow-y-auto py-2">
		{#each items as item, idx (item.id)}
			{#if item.kind === 'link'}
				{@const active = isActiveRoute(page.url.pathname, item.href)}
				<Link
					href={item.href}
					onclick={onClose}
					color="inherit"
					underline="never"
					class="{row} {active ? activeText : idle}"
				>
					{#if item.icon}
						<Icon src={item.icon} class="mr-3 h-6 w-6" aria-hidden="true" />
					{/if}
					<span class="text-base font-light">{item.label}</span>
				</Link>
			{:else}
				{#if idx > 0}
					<div class="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700"></div>
				{/if}
				{#if item.mobileLabel}
					<div
						class="px-4 py-2 text-sm font-medium tracking-wide text-gray-400 uppercase dark:text-gray-600"
					>
						{item.mobileLabel}
					</div>
				{/if}
				{#each item.items as menuItem, i (itemKey(menuItem, i))}
					{#if menuItem.kind === 'divider'}
						<div class="mx-4 my-1 border-t border-gray-200 dark:border-gray-700"></div>
					{:else if menuItem.kind === 'link'}
						<Link
							href={menuItem.href}
							onclick={onClose}
							color="inherit"
							underline="never"
							class="{row} {idle}"
						>
							{#if menuItem.icon}
								<Icon src={menuItem.icon} class="mr-3 h-6 w-6" aria-hidden="true" />
							{/if}
							<span class="text-base font-light">{menuItem.label}</span>
						</Link>
					{:else if menuItem.kind === 'toggle'}
						<button
							onclick={() => runAndClose(menuItem.onToggle)}
							class="w-full text-left {row} {idle}"
						>
							{#if menuItem.icon}
								<Icon src={menuItem.icon} class="mr-3 h-6 w-6" aria-hidden="true" />
							{/if}
							<span class="flex-1 text-base font-light">{menuItem.label}</span>
							<span
								class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors {menuItem.isOn
									? 'bg-gray-900 dark:bg-gray-200'
									: 'bg-gray-300 dark:bg-gray-600'}"
							>
								<span
									class="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform dark:bg-gray-900 {menuItem.isOn
										? 'translate-x-4'
										: 'translate-x-1'}"
								></span>
							</span>
						</button>
					{:else}
						<button
							onclick={() => runAndClose(menuItem.onClick)}
							class="w-full text-left {row} {menuItem.isActive ? activeText : idle}"
						>
							{#if menuItem.icon}
								<Icon src={menuItem.icon} class="mr-3 h-6 w-6" aria-hidden="true" />
							{/if}
							<span class="text-base font-light">{menuItem.label}</span>
						</button>
					{/if}
				{/each}
			{/if}
		{/each}
	</div>
</div>
