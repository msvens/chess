<script lang="ts">
	/**
	 * Upcoming tournaments, in three views. Ports `app/calendar/page.tsx`.
	 *
	 * One fetch feeds all three tabs. The four filters chain exactly as they do on
	 * `/results` — each one's counts reflect the ones above it — with district
	 * first, because it is the only one that needs the organizations data.
	 *
	 * Page-local state rather than a store: nothing outside this page reads any of
	 * it, which is the same call `/results` makes.
	 */
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import DistrictFilter from '$lib/components/filters/DistrictFilter.svelte';
	import TournamentCategoryFilter from '$lib/components/filters/TournamentCategoryFilter.svelte';
	import TournamentTypeFilter from '$lib/components/filters/TournamentTypeFilter.svelte';
	import TournamentStateFilter from '$lib/components/filters/TournamentStateFilter.svelte';
	import TournamentList from '$lib/components/tournaments/TournamentList.svelte';
	import CalendarView from '$lib/components/calendar/CalendarView.svelte';
	import MapView from '$lib/components/calendar/MapView.svelte';
	import { initialTab, saveTab, type CalendarTab } from '$lib/components/calendar/calendarPrefs';
	import { TournamentService, type TournamentDto } from '$lib/api';
	import {
		countByCategory,
		countByState,
		countByType,
		filterByCategory,
		filterByState,
		filterByType,
		type TournamentCategory
	} from '$lib/utils/tournamentFilters';
	import {
		districtCounts as countByDistrict,
		districtsOf,
		filterByDistrict
	} from '$lib/components/calendar/tournamentDistricts';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import { onMount } from 'svelte';

	const service = new TournamentService();
	const organizations = getOrganizationsState();

	// Read at initialisation, not in a mount effect: under the SPA there is no
	// server render to stay safe for, and the effect made the default tab paint
	// first and then jump.
	let tab = $state<CalendarTab>(initialTab());

	let tournaments = $state<TournamentDto[]>([]);
	let loading = $state(true);
	let failed = $state(false);

	let districtId = $state<number | null>(null);
	let category = $state<TournamentCategory>('all');
	let type = $state<number | null>(null);
	let tournamentState = $state<number | null>(null);

	let t = $derived(getTranslation(language.current));
	let cal = $derived(t.pages.calendar);

	/**
	 * A flag, not a message.
	 *
	 * The React version built the English or Swedish string inside the fetch and
	 * therefore had to list `language` as a dependency — so switching language
	 * refetched all 137 tournaments and flashed the loading state. Deciding the
	 * wording here instead means the fetch runs once.
	 *
	 * One failure mode, not two: the React version also had a `catch` with its own
	 * message, but the SDK never throws — it resolves with a status.
	 */
	let error = $derived(failed ? cal.loadError : undefined);

	// `onMount`, not `$effect`: this must run exactly once, and an effect would
	// quietly start re-running the moment a reactive read crept into it — which is
	// how the React version ended up refetching on every language change.
	onMount(() => {
		let cancelled = false;

		(async () => {
			const response = await service.searchComingTournaments();
			if (cancelled) return;

			if (response.status === 200 && response.data) {
				tournaments = response.data;
			} else {
				failed = true;
			}
			loading = false;
		})();

		return () => {
			cancelled = true;
		};
	});

	function selectTab(next: CalendarTab) {
		tab = next;
		saveTab(next);
	}

	/** District for each tournament, from the pre-loaded organizations data. */
	let districtOf = $derived(
		districtsOf(tournaments, (orgType, orgNumber) =>
			organizations.getDistrictIdForOrganizer(orgType, orgNumber)
		)
	);

	let byDistrict = $derived(filterByDistrict(tournaments, districtOf, districtId));

	// Chained, so each filter's counts reflect the ones above it.
	let categoryCounts = $derived(countByCategory(byDistrict));
	let byCategory = $derived(filterByCategory(byDistrict, category));
	let typeCounts = $derived(countByType(byCategory));
	let byType = $derived(filterByType(byCategory, type));
	let stateCounts = $derived(countByState(byType));
	let visible = $derived(filterByState(byType, tournamentState));

	let districtCounts = $derived(countByDistrict(tournaments, districtOf));
</script>

<svelte:head><title>{cal.title} — msvens chess</title></svelte:head>

<PageLayout maxWidth="4xl">
	<PageTitle title={cal.title} subtitle={cal.subtitle} />

	<div class="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
		<DistrictFilter
			selectedDistrictId={districtId}
			onSelect={(id) => (districtId = id)}
			variant="dropdown"
			density="compact"
			transparent
			{districtCounts}
			totalCount={tournaments.length}
		/>
		<TournamentCategoryFilter
			selected={category}
			onSelect={(value) => (category = value)}
			counts={categoryCounts}
			density="compact"
			transparent
		/>
		<TournamentTypeFilter
			selected={type}
			onSelect={(value) => (type = value)}
			counts={typeCounts}
			density="compact"
			transparent
		/>
		<TournamentStateFilter
			selected={tournamentState}
			onSelect={(value) => (tournamentState = value)}
			counts={stateCounts}
			density="compact"
			transparent
		/>
	</div>

	<div class="mb-4 flex border-b border-gray-200 dark:border-gray-700">
		{#each ['calendar', 'list', 'map'] as const as name (name)}
			<button
				type="button"
				onclick={() => selectTab(name)}
				class="px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors {tab === name
					? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
					: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}"
			>
				{cal.tabs[name]}
			</button>
		{/each}
	</div>

	{#if tab === 'list'}
		<TournamentList tournaments={visible} {loading} {error} />
	{:else if tab === 'calendar'}
		<CalendarView tournaments={visible} {loading} {error} />
	{:else if tab === 'map'}
		<MapView tournaments={visible} {loading} {error} />
	{/if}
</PageLayout>
