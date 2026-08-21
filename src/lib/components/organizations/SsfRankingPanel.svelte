<script lang="ts">
	/**
	 * Federation (SSF) ranking: filters + rating table.
	 *
	 * Ports `components/organizations/SsfRankingPanel.tsx`. It is a component
	 * rather than page content because both `/organizations/ssf` and the SSF tab on
	 * `/organizations` render the same thing.
	 */
	import { RatingsService, type PlayerInfoDto } from '$lib/api';
	import RatingFilters from './RatingFilters.svelte';
	import RatingTable from './RatingTable.svelte';
	import { getDefaultRatingFilters, type RatingFiltersValue } from './ratingFilters';

	let filters = $state<RatingFiltersValue>(getDefaultRatingFilters());
	let players = $state<PlayerInfoDto[]>([]);
	let loading = $state(true);

	const service = new RatingsService();

	// Guards against an earlier request finishing after a later one and overwriting
	// fresher results — easy to hit here, since changing a filter refires instantly.
	let token = 0;

	$effect(() => {
		const { ratingDate, ratingType, memberType } = filters;
		const mine = ++token;
		loading = true;
		service
			.getFederationRatingList(ratingDate, ratingType, memberType)
			.then((response) => {
				if (mine !== token) return;
				players = response.data ?? [];
			})
			.finally(() => {
				if (mine === token) loading = false;
			});
	});
</script>

<div class="space-y-6">
	<RatingFilters value={filters} onChange={(next) => (filters = next)} />
	<RatingTable {players} ratingType={filters.ratingType} {loading} />
</div>
