<script lang="ts">
	/**
	 * One row inside the desktop dropdown panel. Ports the `DropdownItem` helper
	 * from `navbar/NavDropdown.tsx`.
	 *
	 * Four shapes share one row style: a link, a switch-style toggle, a plain
	 * action, and a divider.
	 */
	import { Icon } from 'svelte-hero-icons';
	import Link from '$lib/components/ui/Link.svelte';
	import type { DropdownMenuItem } from './navTypes';

	let { item }: { item: DropdownMenuItem } = $props();

	const base = 'w-full text-left flex items-center gap-2 px-4 py-2 text-sm transition-colors';
	const idle = 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800';
</script>

{#if item.kind === 'divider'}
	<div class="my-1 border-t border-gray-200 dark:border-gray-700"></div>
{:else if item.kind === 'link'}
	<Link href={item.href} color="inherit" underline="never" class="{base} {idle}">
		{#if item.icon}<Icon src={item.icon} class="h-4 w-4" aria-hidden="true" />{/if}
		<span>{item.label}</span>
	</Link>
{:else if item.kind === 'toggle'}
	<button onclick={item.onToggle} class="{base} {idle}">
		{#if item.icon}<Icon src={item.icon} class="h-4 w-4" aria-hidden="true" />{/if}
		<span class="flex-1">{item.label}</span>
		<span
			class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors {item.isOn
				? 'bg-gray-900 dark:bg-gray-200'
				: 'bg-gray-300 dark:bg-gray-600'}"
		>
			<span
				class="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform dark:bg-gray-900 {item.isOn
					? 'translate-x-4'
					: 'translate-x-1'}"
			></span>
		</span>
	</button>
{:else}
	<button
		onclick={item.onClick}
		class="{base} {item.isActive
			? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-200'
			: idle}"
	>
		{#if item.icon}<Icon src={item.icon} class="h-4 w-4" aria-hidden="true" />{/if}
		<span>{item.label}</span>
	</button>
{/if}
