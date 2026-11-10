<script lang="ts">
	/**
	 * Tournaments being played today.
	 *
	 * The subtitle stays visible on phones: the upstream lists cannot show an
	 * event ending today until it has results, and without that note a short
	 * list in the morning looks like a bug.
	 */
	import { onMount } from 'svelte';
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import TodayTournaments from '$lib/components/today/TodayTournaments.svelte';
	import {
		getTournamentsToday,
		isGrandPrix,
		TournamentService,
		type TournamentToday
	} from '$lib/api';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let tournaments = $state<TournamentToday[]>([]);
	let loading = $state(true);
	let failed = $state(false);

	let t = $derived(getTranslation(language.current).pages.today);

	onMount(() => {
		let cancelled = false;

		(async () => {
			const response = await getTournamentsToday({ service: new TournamentService() });
			if (cancelled) return;

			if (response.status === 200 && response.data) {
				// A series has no results, and its round dates don't reflect play.
				tournaments = response.data.filter((tournament) => !isGrandPrix(tournament.type));
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
	<TodayTournaments {tournaments} {loading} error={failed ? t.loadError : undefined} />
</PageLayout>
