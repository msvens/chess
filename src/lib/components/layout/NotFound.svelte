<script lang="ts">
	/**
	 * What a visitor sees instead of a page that isn't there: a wrong URL, or an
	 * id that matches nothing. Every not-found and the error page use this, so
	 * none of them is ever blank and each offers a way onward.
	 *
	 * Without props it is the generic "we couldn't find the page", linking home;
	 * a page passes its own title and a nearer link ("back to the standings").
	 */
	import Link from '$lib/components/ui/Link.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface NotFoundProps {
		title?: string;
		message?: string;
		href?: string;
		linkLabel?: string;
	}

	let { title, message, href = '/', linkLabel }: NotFoundProps = $props();

	let t = $derived(getTranslation(language.current).notFound);
</script>

<div class="text-center">
	<div class="rounded-lg border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-dark-bg">
		<h1 class="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-200">
			{title ?? t.title}
		</h1>
		{#if message !== undefined || title === undefined}
			<p class="mb-6 text-lg text-gray-600 dark:text-gray-400">{message ?? t.message}</p>
		{/if}
		<Link {href}>{linkLabel ?? t.home}</Link>
	</div>
</div>
