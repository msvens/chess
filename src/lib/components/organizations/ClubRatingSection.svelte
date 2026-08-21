<script lang="ts">
	/**
	 * Rating filters + table, fetching from whichever rating list the caller names.
	 *
	 * The club and district detail pages differ only in which service call fills
	 * the table, so the filter state, the staleness guard and the heading live here
	 * once rather than twice.
	 */
	import type { PlayerInfoDto, ApiResponse } from '$lib/api';
	import RatingFilters from './RatingFilters.svelte';
	import RatingTable from './RatingTable.svelte';
	import { getDefaultRatingFilters, type RatingFiltersValue } from './ratingFilters';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface ClubRatingSectionProps {
		/** Runs the appropriate getXRatingList for the current filters. */
		fetchRatings: (filters: RatingFiltersValue) => Promise<ApiResponse<PlayerInfoDto[]>>;
	}

	let { fetchRatings }: ClubRatingSectionProps = $props();

	let filters = $state<RatingFiltersValue>(getDefaultRatingFilters());
	let players = $state<PlayerInfoDto[]>([]);
	let loading = $state(true);

	// Filters can change faster than the API answers; without this an earlier
	// response can land last and overwrite fresher data.
	let token = 0;

	$effect(() => {
		const current = filters;
		const mine = ++token;
		loading = true;
		fetchRatings(current)
			.then((response) => {
				if (mine !== token) return;
				players = response.data ?? [];
			})
			.finally(() => {
				if (mine === token) loading = false;
			});
	});

	let t = $derived(getTranslation(language.current));
</script>

<div class="mt-8 space-y-4">
	<h3 class="text-xl font-bold text-gray-900 dark:text-gray-200">
		{t.pages.organizations.ratingList.title}
	</h3>
	<RatingFilters value={filters} onChange={(next) => (filters = next)} />
	<RatingTable {players} ratingType={filters.ratingType} {loading} />
</div>
