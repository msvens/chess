<script lang="ts">
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import SsfRankingPanel from '$lib/components/organizations/SsfRankingPanel.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import PageHead from '$lib/components/layout/PageHead.svelte';

	let t = $derived(getTranslation(language.current).pages.organizations.ssf);
</script>

<PageHead title={t.title} description={t.subtitle} />

<PageLayout maxWidth="4xl">
	<div class="space-y-6">
		<PageTitle title={t.title} subtitle={t.subtitle} />
		<SsfRankingPanel />
	</div>
</PageLayout>
