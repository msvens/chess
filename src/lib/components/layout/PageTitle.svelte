<script lang="ts">
	/**
	 * Page heading and optional subtitle. Ports `components/PageTitle.tsx`.
	 *
	 * The subtitle hides on mobile by default — it is explanatory prose that costs
	 * more vertical space than it earns on a phone.
	 */
	import type { Snippet } from 'svelte';

	interface PageTitleProps {
		title: string;
		/** Plain text, or a snippet when it needs markup (a link, say). */
		subtitle?: string;
		subtitleSnippet?: Snippet;
		hideSubtitleOnMobile?: boolean;
	}

	let { title, subtitle, subtitleSnippet, hideSubtitleOnMobile = true }: PageTitleProps = $props();

	let hasSubtitle = $derived(Boolean(subtitle || subtitleSnippet));
</script>

<div class="mb-10">
	<h1 class="mb-2 text-3xl font-light tracking-wide text-gray-900 dark:text-gray-200">
		{title}
	</h1>
	{#if hasSubtitle}
		<p class="text-gray-600 dark:text-gray-400 {hideSubtitleOnMobile ? 'hidden sm:block' : ''}">
			{#if subtitleSnippet}{@render subtitleSnippet()}{:else}{subtitle}{/if}
		</p>
	{/if}
</div>
