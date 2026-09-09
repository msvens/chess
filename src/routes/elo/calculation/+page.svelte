<script lang="ts">
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import CalculationEn from '$lib/components/elo/CalculationEn.svelte';
	import CalculationSv from '$lib/components/elo/CalculationSv.svelte';
	import ExpectedScoreWidget from '$lib/components/elo/ExpectedScoreWidget.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let t = $derived(getTranslation(language.current).pages.elo.calculation);
</script>

<PageTitle title={t.title} subtitle={t.subtitle} />
{#if language.current === 'en'}
	<CalculationEn />
{:else}
	<CalculationSv />
{/if}
<div class="mt-8">
	<ExpectedScoreWidget />
</div>
