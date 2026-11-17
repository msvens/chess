<script lang="ts">
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import BasicsEn from '$lib/components/elo/BasicsEn.svelte';
	import BasicsSv from '$lib/components/elo/BasicsSv.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import PageHead from '$lib/components/layout/PageHead.svelte';

	let t = $derived(getTranslation(language.current).pages.elo.basics);
</script>

<PageHead title={t.title} description={t.subtitle} />
<PageTitle title={t.title} subtitle={t.subtitle} />
{#if language.current === 'en'}
	<BasicsEn />
{:else}
	<BasicsSv />
{/if}
