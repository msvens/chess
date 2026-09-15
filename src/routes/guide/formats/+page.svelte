<script lang="ts">
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import FormatsEn from '$lib/components/guide/FormatsEn.svelte';
	import FormatsSv from '$lib/components/guide/FormatsSv.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let t = $derived(getTranslation(language.current).pages.guide.formats);
</script>

<PageTitle title={t.title} subtitle={t.subtitle} />
{#if language.current === 'en'}
	<FormatsEn />
{:else}
	<FormatsSv />
{/if}
