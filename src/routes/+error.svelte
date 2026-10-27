<script lang="ts">
	/**
	 * Shown inside the root layout for any URL without a route, and for a page
	 * that fails to render. Production serves the app for every path, so the
	 * client router is what reaches this, for a mistyped link as much as anything.
	 *
	 * Never the raw error text: it means nothing to a visitor.
	 */
	import { page } from '$app/state';
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import NotFound from '$lib/components/layout/NotFound.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let t = $derived(getTranslation(language.current).notFound);
	let missing = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{missing ? t.title : t.errorTitle} — msvens chess</title>
</svelte:head>

<PageLayout maxWidth="3xl">
	{#if missing}
		<NotFound />
	{:else}
		<NotFound title={t.errorTitle} message={t.errorMessage} />
	{/if}
</PageLayout>
