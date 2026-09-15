<script lang="ts">
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import Changelog from '$lib/components/changelog/Changelog.svelte';
	import { changelog } from '$lib/data/changelog';
</script>

<PageLayout maxWidth="4xl">
	<div class="bg-white p-8 pt-0 dark:bg-dark-bg">
		<Changelog entries={changelog} />
	</div>
</PageLayout>
