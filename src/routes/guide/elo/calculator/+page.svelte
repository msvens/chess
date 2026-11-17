<script lang="ts">
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import Calculator from '$lib/components/elo/Calculator/Calculator.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import PageHead from '$lib/components/layout/PageHead.svelte';

	let translation = $derived(getTranslation(language.current));
	let t = $derived(translation.pages.elo.calculator);
</script>

<PageHead title={t.title} description={translation.seo.calculator} />
<PageTitle title={t.title} />
<Calculator />
