<script lang="ts">
	import JgpStandings from '$lib/components/junior/JgpStandings.svelte';
	import PageHead from '$lib/components/layout/PageHead.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let t = $derived(getTranslation(language.current).pages.junior);
</script>

<PageHead title={t.title} description={t.subtitle} />

<JgpStandings />
