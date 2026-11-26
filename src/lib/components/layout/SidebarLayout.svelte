<script lang="ts">
	/**
	 * Content with a navigation column beside it on wide screens, and a compact
	 * version of the same navigation above it on narrow ones: the guide's
	 * sections, the results page's classes and groups.
	 *
	 * `breakpoint` says where the column takes over. `md` is the app's phone
	 * line; `lg` suits a page whose content needs the width, such as a wide table.
	 */
	import type { Snippet } from 'svelte';

	type Breakpoint = 'md' | 'lg';

	interface SidebarLayoutProps {
		/** The column, shown from `breakpoint` up. Omit for no navigation at all. */
		sidebar?: Snippet;
		/** The narrow-screen version, shown above the content below `breakpoint`. */
		narrow?: Snippet;
		breakpoint?: Breakpoint;
		/** Keeps the column in view while the content scrolls. */
		sticky?: boolean;
		children: Snippet;
	}

	let {
		sidebar,
		narrow,
		breakpoint = 'md',
		sticky = false,
		children
	}: SidebarLayoutProps = $props();

	// Spelled out: Tailwind cannot see composed class names.
	const classes: Record<Breakpoint, { row: string; column: string; narrow: string }> = {
		md: { row: 'md:flex-row', column: 'hidden md:block', narrow: 'md:hidden' },
		lg: { row: 'lg:flex-row', column: 'hidden lg:block', narrow: 'lg:hidden' }
	};

	let c = $derived(classes[breakpoint]);
</script>

<div class="flex flex-col gap-6 {c.row}">
	{#if sidebar}
		<nav class="w-56 shrink-0 {c.column}">
			<div class={sticky ? 'sticky top-24' : ''}>{@render sidebar()}</div>
		</nav>
	{/if}
	<div class="min-w-0 flex-1">
		{#if narrow}
			<div class="mb-6 {c.narrow}">{@render narrow()}</div>
		{/if}
		{@render children()}
	</div>
</div>
