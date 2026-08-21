<script lang="ts">
	/**
	 * A "Label: value" pair in the club/district info grid. Was a local helper in
	 * `app/organizations/clubs/[id]/page.tsx`; both detail pages want it.
	 */
	import type { Snippet } from 'svelte';

	interface InfoFieldProps {
		label: string;
		/** Plain text, or a snippet when the value needs a link. */
		value?: string;
		children?: Snippet;
	}

	let { label, value, children }: InfoFieldProps = $props();
</script>

<div>
	<span class="font-semibold text-gray-700 dark:text-gray-300">{label}:</span>
	<span class="text-gray-600 dark:text-gray-400">
		{#if children}{@render children()}{:else}{value ?? '-'}{/if}
	</span>
</div>
