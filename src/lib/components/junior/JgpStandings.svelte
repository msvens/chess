<script lang="ts">
	/**
	 * The Stockholms JGP standings: division tabs, a season to pick, the
	 * tournament key, and one table per age class.
	 * Ports `components/junior/JgpStandings.tsx`.
	 *
	 * One component for both divisions, where React had two that differed only in
	 * the age-class tabs and the finals link. The open series scores a placement
	 * ladder per birth-year class; girls is one combined percentile ranking, which
	 * the loader hands back as a single unlabelled table.
	 */
	import { untrack } from 'svelte';
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import Link from '$lib/components/ui/Link.svelte';
	import SelectableList from '$lib/components/ui/SelectableList.svelte';
	import JgpStandingsTable from './JgpStandingsTable.svelte';
	import JgpTournamentLegend from './JgpTournamentLegend.svelte';
	import {
		JGP_DIVISIONS,
		initialDivision,
		initialYear,
		saveDivision,
		saveYear
	} from './juniorPrefs';
	import { jgpSeasons } from '$lib/data/jgp/seasons';
	import type { JgpDivision } from '$lib/data/jgp/types';
	import { JgpStandingsState } from '$lib/stores/jgpStandings.svelte';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	const OFFICIAL_JGP_URL = 'https://www.stockholmsschack.se/juniortavlingar/#junior-grand-prix';

	const organizations = getOrganizationsState();
	const standings = new JgpStandingsState();

	/** A division's seasons, newest first. */
	const yearsFor = (division: JgpDivision) =>
		jgpSeasons
			.filter((season) => season.division === division)
			.map((season) => season.year)
			.sort((a, b) => b - a);

	// Both read from storage at initialisation. The React version seeded the
	// newest open season and then flipped to the saved one in an effect, to keep
	// the server and the first client render identical; this SPA renders only on
	// the client, so there is nothing to match and no flash to avoid.
	let division = $state<JgpDivision>(initialDivision());
	let year = $state<number | null>(initialYear(yearsFor(initialDivision())));
	let selectedAge = $state<string | null>(null);

	let t = $derived(getTranslation(language.current).pages.junior);
	let years = $derived(yearsFor(division));
	let season = $derived(jgpSeasons.find((s) => s.division === division && s.year === year) ?? null);

	function selectDivision(next: JgpDivision) {
		division = next;
		saveDivision(next);
		// Keep the season being looked at if the other division ran one that year.
		year = initialYear(yearsFor(next));
		selectedAge = null;
	}

	function selectYear(next: number) {
		year = next;
		saveYear(next);
		selectedAge = null;
	}

	/**
	 * Wait for the club data before scoring: eligibility is a Stockholm-district
	 * question, and without the clubs every player answers no and the standings
	 * come out empty.
	 */
	$effect(() => {
		if (organizations.loading || !season) return;
		const current = season;
		untrack(() => standings.load(current, (clubId) => organizations.getClub(clubId)));
	});

	/**
	 * Waiting for the clubs is still waiting: without this the page would say it
	 * has no standings before it has tried to compute any.
	 */
	let loading = $derived(organizations.loading || standings.loading);
	let tables = $derived(standings.tables);
	let active = $derived(
		tables?.find((table) => table.ageClass.label === selectedAge) ?? tables?.[0] ?? null
	);

	const tabClasses = {
		selected: 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400',
		idle: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
	} as const;
</script>

{#snippet tab(label: string, selected: boolean, select: () => void)}
	<button
		type="button"
		onclick={select}
		class="pb-2 text-sm font-medium transition-colors {selected
			? tabClasses.selected
			: tabClasses.idle}"
	>
		{label}
	</button>
{/snippet}

<div
	class="mb-4 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm font-medium text-orange-800 dark:border-orange-700/50 dark:bg-orange-900/20 dark:text-orange-200"
>
	{t.demoBanner}
</div>

<PageTitle title={t.title} subtitleSnippet={subtitle} />

{#snippet subtitle()}
	{t.subtitle} ·
	<Link href={OFFICIAL_JGP_URL} external>{t.officialPageLink}</Link>
{/snippet}

<div class="mb-4 flex gap-4 border-b border-gray-200 dark:border-gray-700">
	{#each JGP_DIVISIONS as candidate (candidate)}
		{@render tab(t.tabs[candidate], division === candidate, () => selectDivision(candidate))}
	{/each}
</div>

{#if !season}
	<p class="py-8 text-gray-600 dark:text-gray-400">{t.noData}</p>
{:else}
	<div class="mb-6 w-40">
		<SelectableList
			variant="dropdown"
			title={t.year}
			items={years.map((y) => ({ id: y, label: String(y) }))}
			selectedId={year}
			onSelect={(id) => selectYear(Number(id))}
			placeholder={t.year}
			density="compact"
		/>
	</div>

	<div
		class="mb-6 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-200"
	>
		{t.disclaimer}
	</div>

	<div class="mb-8">
		<JgpTournamentLegend tournaments={season.tournaments} />
		{#if division === 'open' && season.finalsTournamentId != null}
			<p class="mt-2 text-sm">
				<Link href="/results/{season.finalsTournamentId}">{t.finalsLink}</Link>
			</p>
		{/if}
	</div>

	{#if loading}
		<p class="py-8 text-gray-600 dark:text-gray-400">{t.loading}</p>
	{:else if standings.error}
		<p class="py-8 text-red-600 dark:text-red-400">{t.error}: {standings.error}</p>
	{:else if !active || active.rows.length === 0}
		<p class="py-8 text-gray-600 dark:text-gray-400">{t.noData}</p>
	{:else}
		{#if division === 'open' && tables}
			<div
				class="mb-4 flex flex-wrap gap-x-4 gap-y-1 border-b border-gray-200 dark:border-gray-700"
			>
				{#each tables as table (table.ageClass.label)}
					{@render tab(
						table.ageClass.label,
						active.ageClass.label === table.ageClass.label,
						() => (selectedAge = table.ageClass.label)
					)}
				{/each}
			</div>
		{/if}

		<JgpStandingsTable table={active} tournaments={season.tournaments} />
	{/if}
{/if}
