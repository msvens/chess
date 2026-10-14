<script lang="ts">
	/**
	 * Every player of every group in the tournament, ranked by performance —
	 * resultat.schack.se's "Individuella resultat". Loaded only when opened: it
	 * needs every group's results and, for a multi-month event, historical
	 * ratings.
	 */
	import { page } from '$app/state';
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import Link from '$lib/components/ui/Link.svelte';
	import IndividualPerformanceTable from '$lib/components/results/IndividualPerformanceTable.svelte';
	import { IndividualPerformanceState } from '$lib/stores/individualPerformance.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	const list = new IndividualPerformanceState();

	let tr = $derived(getTranslation(language.current).pages.tournamentResults);
	let ip = $derived(tr.individualPerformance);

	let tournamentId = $derived(Number.parseInt(page.params.tournamentId ?? '', 10));
	let validId = $derived(Number.isFinite(tournamentId));

	$effect(() => {
		if (validId) list.load(tournamentId);
	});
</script>

<PageLayout fullScreen maxWidth="5xl">
	{#if !validId}
		<div class="text-center text-lg text-gray-600 dark:text-gray-400">{tr.errors.invalidIds}</div>
	{:else if list.failed}
		<div class="text-center text-lg text-gray-600 dark:text-gray-400">
			{tr.errors.tournamentFetchFailed}
		</div>
	{:else if list.tournament}
		<div class="mb-6">
			<h1 class="mb-2 text-2xl font-light text-gray-900 md:text-3xl dark:text-gray-200">
				{list.tournament.name}
			</h1>
			<div class="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
				<span>{list.tournament.start} - {list.tournament.end}</span>
				{#if list.tournament.city}<span>{list.tournament.city}</span>{/if}
			</div>
			<div class="mt-3 text-sm">
				<Link href="/results/{tournamentId}" color="blue">{ip.backToResults}</Link>
			</div>
		</div>

		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-200">{ip.title}</h2>

		{#if !list.available}
			<p class="text-gray-600 dark:text-gray-400">{ip.notAvailable}</p>
		{:else if list.loading}
			<p class="text-gray-600 dark:text-gray-400">
				{ip.loadingRatings}
			</p>
		{:else}
			<IndividualPerformanceTable
				rows={list.rows}
				{tournamentId}
				playerOf={(playerId) => list.playerOf(playerId)}
				clubOf={(playerId) => list.clubOf(playerId)}
			/>
		{/if}
	{:else if !list.loading}
		<div class="text-center text-lg text-gray-600 dark:text-gray-400">{tr.notFound}</div>
	{/if}
</PageLayout>
