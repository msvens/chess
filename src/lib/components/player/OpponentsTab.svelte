<script lang="ts">
	/**
	 * Everyone a player has faced: their record by colour, and every game.
	 * Ports `components/player/OpponentsTab.tsx`.
	 *
	 * All the arithmetic is the SDK's — `filterGamesByTimeControl`,
	 * `calculateStatsByColor`, `gamesToDisplayFormat`. What is left here is the
	 * filter, the counts beside each option, and knowing when opponent names have
	 * arrived.
	 *
	 * The React version's six memos exist to re-read a `useRef` cache through a
	 * deliberately unstable context object. None of that survives: `playerCache`
	 * is a module singleton over a `SvelteMap`, so the names appear as they land.
	 */
	import TimeControlFilter, { type TimeControl } from './TimeControlFilter.svelte';
	import OpponentGamesTable from './OpponentGamesTable.svelte';
	import OpponentPieCharts from './OpponentPieCharts/OpponentPieCharts.svelte';
	import {
		calculateStatsByColor,
		filterGamesByTimeControl,
		gamesToDisplayFormat,
		type ColorStats
	} from '$lib/api';
	import { getPlayerProfileState } from '$lib/stores/playerProfile.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	const profile = getPlayerProfileState();

	let t = $derived(getTranslation(language.current));
	let ot = $derived(t.pages.playerDetail.opponentsTab);

	let selected = $state<TimeControl>('all');

	let counts = $derived({
		all: profile.games.length,
		standard: filterGamesByTimeControl(profile.games, profile.tournamentMap, 'standard').length,
		rapid: filterGamesByTimeControl(profile.games, profile.tournamentMap, 'rapid').length,
		blitz: filterGamesByTimeControl(profile.games, profile.tournamentMap, 'blitz').length,
		unrated: filterGamesByTimeControl(profile.games, profile.tournamentMap, 'unrated').length
	});

	let filtered = $derived(filterGamesByTimeControl(profile.games, profile.tournamentMap, selected));

	const NO_STATS: ColorStats = { wins: 0, draws: 0, losses: 0 };

	/** Recomputed per filter — the charts follow the time control, as they did. */
	let stats = $derived(
		profile.memberId === null
			? { all: NO_STATS, white: NO_STATS, black: NO_STATS }
			: calculateStatsByColor(filtered, profile.memberId)
	);

	/**
	 * Games ready to render.
	 *
	 * `gamesToDisplayFormat` is told whether names are still coming so it can say
	 * "retrieving" rather than "unknown" — the difference between "we have not
	 * asked yet" and "the API has no record".
	 */
	let displayGames = $derived(
		profile.memberId === null
			? []
			: gamesToDisplayFormat(
					filtered,
					profile.memberId,
					profile.playerMap,
					profile.tournamentMap,
					profile.currentPlayerName,
					profile.opponentsLoading(filtered),
					ot.table.retrieving,
					ot.table.unknown
				)
	);
</script>

{#if profile.gamesLoading}
	<div class="py-12 text-center">
		<div class="text-lg text-gray-600 dark:text-gray-400">{ot.loading}</div>
	</div>
{:else if profile.gamesFailed}
	<div class="py-12 text-center">
		<div class="text-gray-600 dark:text-gray-400">
			{t.pages.playerDetail.tournamentHistory.error}
		</div>
	</div>
{:else if profile.games.length === 0}
	<div class="py-12 text-center">
		<div class="text-lg text-gray-600 dark:text-gray-400">{ot.noOpponents}</div>
	</div>
{:else}
	<div class="space-y-6">
		<div class="flex justify-start">
			<TimeControlFilter {selected} onSelect={(value) => (selected = value)} {counts} />
		</div>

		<OpponentPieCharts all={stats.all} white={stats.white} black={stats.black} />

		<OpponentGamesTable games={displayGames} />
	</div>
{/if}
