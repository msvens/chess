<script lang="ts">
	/**
	 * Tournaments being played today, as the SDK's `getTournamentsToday` gives
	 * them: what counts as played today, and which groups, is the SDK's rule.
	 */
	import { onMount } from 'svelte';
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import TodayTournaments from '$lib/components/today/TodayTournaments.svelte';
	import DistrictFilter from '$lib/components/filters/DistrictFilter.svelte';
	import CalendarLegend from '$lib/components/calendar/CalendarLegend.svelte';
	import { getAllTournamentTypes } from '$lib/utils/tournamentFilters';
	import {
		districtCounts as countByDistrict,
		districtsOf,
		filterByDistrict
	} from '$lib/components/calendar/tournamentDistricts';
	import { getTournamentsToday, TournamentService, type TournamentToday } from '$lib/api';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import PageHead from '$lib/components/layout/PageHead.svelte';

	const organizations = getOrganizationsState();

	let tournaments = $state<TournamentToday[]>([]);
	let loading = $state(true);
	let failed = $state(false);

	/** All districts on every visit; the choice is not remembered. */
	let districtId = $state<number | null>(null);

	let t = $derived(getTranslation(language.current).pages.today);

	// The organiser's district, as in the calendar. Filtered here rather than by
	// the SDK's `districtId`, so switching is instant and each district has a
	// count. With counts, the dropdown lists only the districts playing today.
	let districtOf = $derived(
		districtsOf(tournaments, (orgType, orgNumber) =>
			organizations.getDistrictIdForOrganizer(orgType, orgNumber)
		)
	);
	let shown = $derived(
		filterByDistrict(tournaments, districtOf, districtId).map((tournament) => ({
			tournament,
			groups: tournament.groupsToday.map(({ group }) => group),
			starts: tournament.marker === 'starts',
			ends: tournament.marker === 'ends'
		}))
	);
	let districtCounts = $derived(countByDistrict(tournaments, districtOf));

	onMount(() => {
		let cancelled = false;

		(async () => {
			const response = await getTournamentsToday({ service: new TournamentService() });
			if (cancelled) return;

			if (response.status === 200 && response.data) {
				// Grand Prix series included: the SDK only lists one on its start or
				// end, as a marker, the same as the calendar shows it.
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
</script>

<PageHead title={t.title} description={t.subtitle} />

<PageLayout maxWidth="4xl">
	<PageTitle title={t.title} subtitle={t.subtitle} hideSubtitleOnMobile={false} />
	{#if tournaments.length > 0}
		<!-- One cell of the calendar's filter grid, so the dropdown has the same width. -->
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
			<!-- The calendar's colour key, at the row's right end: the list's dots
			     mean nothing without it. Every type, not only today's, so the key
			     reads the same whatever is on. -->
			<div class="flex items-end justify-end md:col-span-3">
				<CalendarLegend types={getAllTournamentTypes()} align="end" />
			</div>
		</div>
	{/if}
	<TodayTournaments tournaments={shown} {loading} error={failed ? t.loadError : undefined} />
</PageLayout>
