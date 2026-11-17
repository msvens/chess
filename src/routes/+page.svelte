<script lang="ts">
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import Home from '$lib/components/home/Home.svelte';
	import PageHead from '$lib/components/layout/PageHead.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let t = $derived(getTranslation(language.current).seo);
</script>

<PageHead description={t.home} />

<PageLayout>
	<Home />
</PageLayout>
