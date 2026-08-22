<script lang="ts" module>
	export type BadgeColor = 'amber' | 'blue' | 'gray' | 'green' | 'yellow' | 'red' | 'purple';
</script>

<script lang="ts">
	/**
	 * Small label pill. Ports `components/Badge.tsx`.
	 *
	 * Pass `tooltip` to turn it into an info badge: an ⓘ appears and the text
	 * shows on hover *and* focus, instantly. A native `title` was not enough —
	 * it has a ~1s delay and never appears for keyboard users.
	 */
	import { InformationCircle, Icon } from 'svelte-hero-icons';
	import type { Snippet } from 'svelte';

	// Several badges can share a line; `aria-describedby` needs each tooltip to
	// have an id of its own.
	const tooltipId = $props.id();

	interface BadgeProps {
		children: Snippet;
		color?: BadgeColor;
		/** `pill` is fully rounded; `rounded` just softens the corners. */
		shape?: 'pill' | 'rounded';
		tooltip?: string;
		class?: string;
	}

	let { children, color = 'gray', shape = 'pill', tooltip, class: cls = '' }: BadgeProps = $props();

	// Written out in full: Tailwind's scanner reads literal strings, so a
	// composed `bg-${color}-100` would never be emitted.
	const colorClasses: Record<BadgeColor, string> = {
		amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
		blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
		gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
		green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
		yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
		red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
		purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
	};

	let pill = $derived(
		`inline-flex items-center gap-1 px-2 py-0.5 align-middle text-xs font-medium ${
			shape === 'pill' ? 'rounded-full' : 'rounded'
		} ${colorClasses[color]}`
	);
</script>

{#if tooltip}
	<span class="group relative inline-flex {cls}">
		<!-- A button, not a span with `tabindex`: the badge is focusable precisely
		     so keyboard users can reveal the tooltip, and only interactive
		     elements may take focus. `describedby` is what actually announces the
		     text — the hover/focus styling is the sighted half of the same thing. -->
		<button type="button" class="{pill} cursor-help" aria-describedby={tooltipId}>
			{@render children()}
			<Icon src={InformationCircle} class="h-3.5 w-3.5" aria-hidden="true" />
		</button>
		<span
			id={tooltipId}
			role="tooltip"
			class="pointer-events-none absolute bottom-full left-0 z-50 mb-1 hidden w-max max-w-xs rounded-md bg-gray-900 px-2 py-1 text-xs leading-snug font-normal text-white shadow-lg group-focus-within:block group-hover:block dark:bg-gray-700"
		>
			{tooltip}
		</span>
	</span>
{:else}
	<span class="{pill} {cls}">{@render children()}</span>
{/if}
