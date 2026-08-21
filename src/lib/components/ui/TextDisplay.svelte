<script lang="ts">
	/**
	 * Body text that clamps to `maxLines` on small screens, with a chevron to
	 * expand. Ports `components/TextDisplay.tsx`.
	 *
	 * Desktop always shows the full text — the clamp exists to stop a long club
	 * description dominating a phone screen, and there is room for it above `md`.
	 */
	import { ChevronDown, Icon } from 'svelte-hero-icons';
	import { MediaQuery } from 'svelte/reactivity';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface TextDisplayProps {
		text: string;
		/** Rendered before the text as "label: ". */
		label?: string;
		/** Lines to show when collapsed. Omit to never clamp. */
		maxLines?: number;
		class?: string;
	}

	let { text, label, maxLines, class: cls = '' }: TextDisplayProps = $props();

	let expanded = $state(false);
	let textEl = $state<HTMLSpanElement | null>(null);
	let overflows = $state(false);

	const large = new MediaQuery('(min-width: 768px)');
	let t = $derived(getTranslation(language.current).components.textDisplay);
	let clamped = $derived(Boolean(maxLines) && !expanded && !large.current);

	// Whether the chevron is needed can only be answered from layout, so it is
	// measured rather than guessed. Re-measured when the text, the clamp or the
	// breakpoint changes.
	$effect(() => {
		void text;
		void maxLines;
		if (!maxLines || !textEl || large.current) {
			overflows = false;
			return;
		}
		const lineHeight = parseFloat(getComputedStyle(textEl).lineHeight);
		// +2px of slack: sub-pixel line heights otherwise report a phantom overflow
		// on text that fits exactly.
		overflows = textEl.scrollHeight > lineHeight * maxLines + 2;
	});
</script>

<div class={cls}>
	{#if label}
		<span class="font-semibold text-gray-700 dark:text-gray-300">{label}: </span>
	{/if}

	<span
		bind:this={textEl}
		class="text-gray-600 dark:text-gray-400"
		style={clamped
			? `display: -webkit-box; -webkit-line-clamp: ${maxLines}; -webkit-box-orient: vertical; overflow: hidden;`
			: undefined}
	>
		{text}
	</span>

	{#if overflows}
		<button
			onclick={() => (expanded = !expanded)}
			class="ml-1 inline-flex items-center text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
			aria-label={expanded ? t.collapse : t.expand}
			aria-expanded={expanded}
		>
			<Icon
				src={ChevronDown}
				class="h-4 w-4 transition-transform {expanded ? 'rotate-180' : ''}"
				aria-hidden="true"
			/>
		</button>
	{/if}
</div>
