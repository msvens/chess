<script lang="ts">
	/**
	 * Tournaments being played today: the calendar's today square, expanded.
	 *
	 * The same data as the calendar (the coming list plus what is played today,
	 * which the coming list drops on its last day) read by the same `playedDays`,
	 * so the two pages cannot disagree about what today holds.
	 *
	 * The subtitle stays visible on phones: the upstream lists cannot show an
	 * event ending today until it has results, and without that note a short
	 * list in the morning looks like a bug.
	 */
	import { onMount } from 'svelte';
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import TodayTournaments from '$lib/components/today/TodayTournaments.svelte';
	import DistrictFilter from '$lib/components/filters/DistrictFilter.svelte';
	import {
		districtCounts as countByDistrict,
		districtsOf,
		filterByDistrict
	} from '$lib/components/calendar/tournamentDistricts';
	import {
		getTournamentsToday,
		isGrandPrix,
		TournamentService,
		type TournamentDto
	} from '$lib/api';
	import { deduplicateTournaments } from '$lib/components/tournaments/tournamentSearch';
	import { toDayNumber } from '$lib/utils/calendarLayout';
	import { playedDays, playedOn } from '$lib/utils/playedDays';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	const organizations = getOrganizationsState();

	let loaded = $state<TournamentDto[]>([]);
	let loading = $state(true);
	let failed = $state(false);

	/** All districts on every visit; the choice is not remembered. */
	let districtId = $state<number | null>(null);

	let t = $derived(getTranslation(language.current).pages.today);

	/** Read once: the page shows the day it was opened on. */
	const today = toDayNumber(new Date());

	let playing = $derived(playedOn(loaded.map(playedDays), today));
	let tournaments = $derived(playing.map((entry) => entry.tournament));

	// The organiser's district, as in the calendar. Filtered here rather than by
	// the SDK's `districtId`, so switching is instant and each district has a
	// count. With counts, the dropdown lists only the districts playing today.
	let districtOf = $derived(
		districtsOf(tournaments, (orgType, orgNumber) =>
			organizations.getDistrictIdForOrganizer(orgType, orgNumber)
		)
	);
	let shown = $derived.by(() => {
		const ids = new Set(filterByDistrict(tournaments, districtOf, districtId).map((t) => t.id));
		return playing.filter((entry) => ids.has(entry.tournament.id));
	});
	let districtCounts = $derived(countByDistrict(tournaments, districtOf));

	onMount(() => {
		let cancelled = false;

		(async () => {
			const service = new TournamentService();
			const [coming, endingToday] = await Promise.all([
				service.searchComingTournaments(),
				getTournamentsToday({ service })
			]);
			if (cancelled) return;

			if (coming.status === 200 && coming.data) {
				// What ends today is only in the second list; if that search fails,
				// today is missing those, as the calendar is.
				loaded = deduplicateTournaments([...coming.data, ...(endingToday.data ?? [])])
					// A series has no results, and its round dates don't reflect play.
					.filter((tournament) => !isGrandPrix(tournament.type));
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

<svelte:head><title>{t.title} — msvens chess</title></svelte:head>

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
		</div>
	{/if}
	<TodayTournaments tournaments={shown} {loading} error={failed ? t.loadError : undefined} />
</PageLayout>
