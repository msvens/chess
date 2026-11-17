<script lang="ts">
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import Changelog from '$lib/components/changelog/Changelog.svelte';
	import { changelog } from '$lib/data/changelog';
	import PageHead from '$lib/components/layout/PageHead.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let t = $derived(getTranslation(language.current).pages.changelog);
</script>

<PageHead title={t.title} description={t.subtitle} />

<PageLayout maxWidth="4xl">
	<div class="bg-white p-8 pt-0 dark:bg-dark-bg">
		<Changelog entries={changelog} />
	</div>
</PageLayout>
