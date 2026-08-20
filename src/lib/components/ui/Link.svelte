<script lang="ts">
	/**
	 * The app's anchor. Ports `components/Link.tsx` including its exact colour and
	 * underline maps, so 27 call sites keep the styling they had.
	 *
	 * SvelteKit needs no Link wrapper for routing — a plain <a> is client-side
	 * navigated. This exists purely for the variants.
	 *
	 * Classes are written out in full rather than composed from fragments, because
	 * Tailwind's scanner only sees literal strings.
	 */
	import type { Snippet } from 'svelte';

	type Color = 'blue' | 'inherit' | 'gray';
	type Underline = 'always' | 'hover' | 'never';

	interface LinkProps {
		href: string;
		children: Snippet;
		color?: Color;
		underline?: Underline;
		class?: string;
		title?: string;
		/**
		 * Explicit accessible name. Needed when the link's content does not read
		 * well on its own — the name algorithm prefers content over `title`, so a
		 * tooltip is not a substitute.
		 */
		ariaLabel?: string;
		onclick?: (event: MouseEvent) => void;
		/** Opens in a new tab, with the rel that makes that safe. */
		external?: boolean;
	}

	let {
		href,
		children,
		color = 'blue',
		underline = 'hover',
		class: cls = '',
		title,
		ariaLabel,
		onclick,
		external = false
	}: LinkProps = $props();

	const colorClasses: Record<Color, string> = {
		blue: 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300',
		inherit: 'text-gray-900 dark:text-gray-200 hover:text-gray-700 dark:hover:text-gray-300',
		gray: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
	};

	const underlineClasses: Record<Underline, string> = {
		always: 'underline',
		hover: 'hover:underline',
		never: 'no-underline'
	};

	let combined = $derived(
		`${colorClasses[color]} ${underlineClasses[underline]} transition-colors ${cls}`.trim()
	);
</script>

<a
	{href}
	class={combined}
	{title}
	aria-label={ariaLabel}
	{onclick}
	target={external ? '_blank' : undefined}
	rel={external ? 'noopener noreferrer' : undefined}
>
	{@render children()}
</a>
