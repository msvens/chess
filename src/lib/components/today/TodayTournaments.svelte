<script lang="ts">
	/**
	 * What is on today: the calendar's day list, for today. `/today` is a
	 * shortcut to that day, so it shows the same rows: the tournament as a
	 * heading, its details, and the groups playing.
	 *
	 * Only the states are its own: loading, and a failed fetch.
	 */
	import DayView from '$lib/components/calendar/DayView.svelte';
	import type { PlayedEntry } from '$lib/utils/playedDays';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface TodayTournamentsProps {
		tournaments: PlayedEntry[];
		loading?: boolean;
		error?: string;
	}

	let { tournaments, loading = false, error }: TodayTournamentsProps = $props();

	let translation = $derived(getTranslation(language.current));
</script>

{#if loading}
	<p class="py-8 text-center text-gray-600 dark:text-gray-400">
		{translation.common.states.loading}
	</p>
{:else if error}
	<p class="py-8 text-center text-gray-600 dark:text-gray-400">{error}</p>
{:else}
	<DayView entries={tournaments} emptyText={translation.pages.today.empty} />
{/if}
