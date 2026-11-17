<script lang="ts">
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import FormatsEn from '$lib/components/guide/FormatsEn.svelte';
	import FormatsSv from '$lib/components/guide/FormatsSv.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import PageHead from '$lib/components/layout/PageHead.svelte';

	let t = $derived(getTranslation(language.current).pages.guide.formats);
</script>

<PageHead title={t.title} description={t.subtitle} />
<PageTitle title={t.title} subtitle={t.subtitle} />
{#if language.current === 'en'}
	<FormatsEn />
{:else}
	<FormatsSv />
{/if}
