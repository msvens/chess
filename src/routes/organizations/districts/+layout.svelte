<script lang="ts">
	/** Both district routes share the standard page container. */
	import PageLayout from '$lib/components/layout/PageLayout.svelte';

	let { children } = $props();
</script>

<PageLayout maxWidth="4xl">
	{@render children()}
</PageLayout>
