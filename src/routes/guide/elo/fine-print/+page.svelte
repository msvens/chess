<script lang="ts">
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import FinePrintEn from '$lib/components/elo/FinePrintEn.svelte';
	import FinePrintSv from '$lib/components/elo/FinePrintSv.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import PageHead from '$lib/components/layout/PageHead.svelte';

	let t = $derived(getTranslation(language.current).pages.elo.finePrint);
</script>

<PageHead title={t.title} description={t.subtitle} />
<PageTitle title={t.title} subtitle={t.subtitle} />
{#if language.current === 'en'}
	<FinePrintEn />
{:else}
	<FinePrintSv />
{/if}
