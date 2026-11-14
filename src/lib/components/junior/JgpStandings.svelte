<script lang="ts">
	/**
	 * The Stockholms JGP standings: division tabs, the tournament key, and one
	 * table per age class. Ports `components/junior/JgpStandings.tsx`.
	 *
	 * The standings are Stockholms Schackförbund's own, current season only, so
	 * there is no season to pick. The open series has a table per birth-year
	 * class; girls is one combined ranking, which arrives as a single unlabelled
	 * table.
	 */
	import { untrack } from 'svelte';
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import Link from '$lib/components/ui/Link.svelte';
	import JgpStandingsTable from './JgpStandingsTable.svelte';
	import JgpTournamentLegend from './JgpTournamentLegend.svelte';
	import { JGP_DIVISIONS, initialDivision, saveDivision } from './juniorPrefs';
	import type { JgpDivision } from '$lib/api/sthlm';
	import { formatDay } from '$lib/dateFormat';
	import { JgpStandingsState } from '$lib/stores/jgpStandings.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	const OFFICIAL_JGP_URL = 'https://www.stockholmsschack.se/juniortavlingar/#junior-grand-prix';

	const standings = new JgpStandingsState();

	let division = $state<JgpDivision>(initialDivision());
	let selectedAge = $state<string | null>(null);

	let t = $derived(getTranslation(language.current).pages.junior);

	function selectDivision(next: JgpDivision) {
		division = next;
		saveDivision(next);
		selectedAge = null;
	}

	$effect(() => {
		const current = division;
		untrack(() => standings.load(current));
	});

	let tables = $derived(standings.tables);
	let active = $derived(
		tables?.find((table) => table.label === selectedAge) ?? tables?.[0] ?? null
	);
	let lastUpdated = $derived(
		standings.lastUpdated ? formatDay(new Date(standings.lastUpdated), language.current) : null
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

{#if standings.loading}
	<p class="py-8 text-gray-600 dark:text-gray-400">{t.loading}</p>
{:else if standings.error}
	<p class="py-8 text-red-600 dark:text-red-400">{t.error}: {standings.error}</p>
{:else if !active || active.rows.length === 0}
	<p class="py-8 text-gray-600 dark:text-gray-400">{t.noData}</p>
{:else}
	<div class="mb-8">
		<JgpTournamentLegend tournaments={standings.tournaments} />
		{#if lastUpdated}
			<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{t.lastUpdated} {lastUpdated}</p>
		{/if}
	</div>

	{#if tables && tables.length > 1}
		<div class="mb-4 flex flex-wrap gap-x-4 gap-y-1 border-b border-gray-200 dark:border-gray-700">
			{#each tables as table (table.label)}
				{@render tab(table.label, active.label === table.label, () => (selectedAge = table.label))}
			{/each}
		</div>
	{/if}

	<JgpStandingsTable table={active} tournaments={standings.tournaments} />
{/if}
