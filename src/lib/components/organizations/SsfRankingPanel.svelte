<script lang="ts">
	/**
	 * Federation (SSF) ranking: filters + rating table.
	 *
	 * Ports `components/organizations/SsfRankingPanel.tsx`. It is a component
	 * rather than page content because both `/organizations/ssf` and the SSF tab on
	 * `/organizations` render the same thing.
	 *
	 * The federation list is the heaviest call in the app (~900 KB, seconds from a
	 * cold upstream), so a failure is worth reporting rather than rendering as an
	 * empty table: the React version showed "No players found" when a request timed
	 * out, which reads as "no such players".
	 */
	import { RatingsService, type PlayerInfoDto } from '$lib/api';
	import Button from '$lib/components/ui/Button.svelte';
	import RatingFilters from './RatingFilters.svelte';
	import RatingTable from './RatingTable.svelte';
	import { getDefaultRatingFilters, type RatingFiltersValue } from './ratingFilters';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let filters = $state<RatingFiltersValue>(getDefaultRatingFilters());
	let players = $state<PlayerInfoDto[]>([]);
	let loading = $state(true);
	let failed = $state(false);

	let labels = $derived(getTranslation(language.current).pages.organizations.ratingList);

	const service = new RatingsService();

	// Guards against an earlier request finishing after a later one and overwriting
	// fresher results — easy to hit here, since changing a filter refires instantly.
	let token = 0;

	function load({ ratingDate, ratingType, memberType }: RatingFiltersValue) {
		const mine = ++token;
		loading = true;
		failed = false;
		service
			.getFederationRatingList(ratingDate, ratingType, memberType)
			.then((response) => {
				if (mine !== token) return;
				players = response.data ?? [];
				// The SDK never throws: a timeout is an `error` with no `data`.
				failed = !response.data;
			})
			.finally(() => {
				if (mine === token) loading = false;
			});
	}

	$effect(() => {
		load(filters);
	});
</script>

<div class="space-y-6">
	<RatingFilters value={filters} onChange={(next) => (filters = next)} />
	<RatingTable
		{players}
		ratingType={filters.ratingType}
		{loading}
		error={failed ? labels.loadFailed : undefined}
	/>
	{#if failed && !loading}
		<div class="text-center">
			<Button onclick={() => load(filters)}>{labels.retry}</Button>
		</div>
	{/if}
</div>
