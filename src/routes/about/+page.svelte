<script lang="ts">
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import AboutEn from '$lib/components/about/AboutEn.svelte';
	import AboutSv from '$lib/components/about/AboutSv.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import PageHead from '$lib/components/layout/PageHead.svelte';
	import { getTranslation } from '$lib/translations';

	let t = $derived(getTranslation(language.current));
</script>

<PageHead title={t.footer.navigation.about} description={t.seo.about} />

<PageLayout maxWidth="4xl">
	<div class="bg-white p-8 pt-0 dark:bg-dark-bg">
		<!-- The site's logo, one image per theme; 320px source, so sharp at 160px on dense screens. -->
		<img
			src={theme.current === 'dark' ? '/logo-large-dark.png' : '/logo-large-light.png'}
			alt="msvens chess"
			width="160"
			height="160"
			class="mx-auto mb-10 h-40 w-40"
		/>

		{#if language.current === 'en'}
			<AboutEn />
		{:else}
			<AboutSv />
		{/if}
	</div>
</PageLayout>
