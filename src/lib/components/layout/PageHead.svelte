<script lang="ts">
	/**
	 * A page's title and description, as search results show them: one place
	 * for the " — msvens chess" suffix, so every page reads the same.
	 *
	 * Set from the page's loaded data where it has a name (a tournament, a
	 * player); Googlebot renders the app, so a title set after a load reaches it.
	 * `noindex` is for pages that should not be in an index of their own, such as
	 * the print view. Not-found states need nothing here: `NotFound` adds it.
	 */
	interface PageHeadProps {
		/** Without one, the title is just the site's name. */
		title?: string;
		description?: string;
		noindex?: boolean;
	}

	let { title, description, noindex = false }: PageHeadProps = $props();
</script>

<svelte:head>
	<title>{title ? `${title} — msvens chess` : 'msvens chess'}</title>
	{#if description}
		<meta name="description" content={description} />
	{/if}
	{#if noindex}
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>
