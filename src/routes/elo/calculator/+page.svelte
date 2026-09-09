<script lang="ts">
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import Calculator from '$lib/components/elo/Calculator/Calculator.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let t = $derived(getTranslation(language.current).pages.elo.calculator);
</script>

<PageTitle title={t.title} />
<Calculator />
