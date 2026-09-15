<script lang="ts">
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import AboutEn from '$lib/components/about/AboutEn.svelte';
	import AboutSv from '$lib/components/about/AboutSv.svelte';
	import { language } from '$lib/stores/language.svelte';
</script>

<PageLayout maxWidth="4xl">
	<div class="bg-white p-8 pt-0 dark:bg-dark-bg">
		{#if language.current === 'en'}
			<AboutEn />
		{:else}
			<AboutSv />
		{/if}
	</div>
</PageLayout>
