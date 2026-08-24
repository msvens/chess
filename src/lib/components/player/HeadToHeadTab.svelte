<script lang="ts">
	/**
	 * Every game against one opponent, and what they came to.
	 * Ports `components/player/HeadToHeadTab.tsx`.
	 *
	 * The React version recomputed the Elo arithmetic twice — once for the column
	 * beside each row, once for the summary below — with subtly different guards,
	 * so the two could disagree. Both now come from `player/headToHead.ts`, over
	 * the same `ratedGame` the results drill-down uses.
	 *
	 * Its `calcPerformance` was also a line-for-line copy of the SDK's
	 * `calculatePerformanceRating`, ±800 clamps included, and is gone.
	 */
	import Link from '$lib/components/ui/Link.svelte';
	import Table from '$lib/components/ui/Table/Table.svelte';
	import type { TableColumn } from '$lib/components/ui/Table/tableTypes';
	import {
		formatRatingWithType,
		gamesToDisplayFormat,
		getPlayerRatingStrict,
		type GameDisplay
	} from '$lib/api';
	import {
		eloChanges,
		groupMetaFor,
		headToHeadGames,
		ratingRequests,
		summarise
	} from '$lib/player/headToHead';
	import { formatEloChange, formatPerformance, type RatingType } from '$lib/results/tournamentElo';
	import { getPlayerProfileState } from '$lib/stores/playerProfile.svelte';
	import { playerCache } from '$lib/stores/playerCache.svelte';
	import { tournamentCache } from '$lib/stores/tournamentCache.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface HeadToHeadTabProps {
		opponentId: number;
	}

	let { opponentId }: HeadToHeadTabProps = $props();

	const profile = getPlayerProfileState();

	let t = $derived(getTranslation(language.current));
	let pd = $derived(t.pages.playerDetail);
	let ot = $derived(pd.opponentsTab);
	let elo = $derived(t.common.eloLabels);

	let memberId = $derived(profile.memberId);

	let games = $derived(
		memberId === null ? [] : headToHeadGames(profile.games, memberId, opponentId)
	);

	let meta = $derived(groupMetaFor(games, (groupId) => tournamentCache.get(groupId)));

	/**
	 * Both players' ratings as they stood at each event.
	 *
	 * The only side effect on this tab, and it belongs to the component rather
	 * than the store: nothing below waits on it — the cells and the summary read
	 * the cache and redraw as records land, because a `SvelteMap` read is
	 * reactive. The React version needed an effect *and* six memos to achieve the
	 * same thing.
	 */
	$effect(() => {
		if (memberId === null || meta.size === 0) return;
		playerCache.fetchManyByDate(ratingRequests(meta, memberId, opponentId));
	});

	/** A record as it stood that month, falling back to the current one. */
	const at = (playerId: number, date: number) =>
		playerCache.getByDate(playerId, date) ?? playerCache.get(playerId);

	let changes = $derived(
		memberId === null
			? new Map<number, number>()
			: eloChanges(games, memberId, opponentId, meta, at)
	);

	let summary = $derived(
		memberId === null ? null : summarise(games, memberId, opponentId, meta, at)
	);

	let displayGames = $derived(
		memberId === null
			? []
			: gamesToDisplayFormat(
					games,
					memberId,
					profile.playerMap,
					profile.tournamentMap,
					profile.currentPlayerName,
					profile.opponentsLoading(games),
					ot.table.retrieving,
					ot.table.unknown
				)
	);

	/** The rating a player brought to that game, as it stood then. */
	function eloAt(playerId: number, groupId: number): string {
		const groupMeta = meta.get(groupId);
		if (!groupMeta) return '-';
		const player = at(playerId, groupMeta.date);
		if (!player?.elo) return '-';
		const { rating, ratingType } = getPlayerRatingStrict(player.elo, groupMeta.rankingAlgorithm);
		return formatRatingWithType(rating, ratingType, language.current);
	}

	const changeLabels: Record<RatingType, string> = $derived({
		standard: elo.eloChange,
		rapid: elo.rapidEloChange,
		blitz: elo.blitzEloChange
	});

	const performanceLabels: Record<RatingType, string> = $derived({
		standard: elo.performanceRating,
		rapid: elo.rapidPerformance,
		blitz: elo.blitzPerformance
	});

	/**
	 * Which rating types the panel shows.
	 *
	 * With nothing rated it still shows one row, of dashes — the panel would look
	 * broken with a total and no Elo line under it at all.
	 */
	let panelTypes = $derived<RatingType[]>(
		summary && summary.ratedTypes.length > 0 ? summary.ratedTypes : ['standard']
	);

	let columns = $derived([
		{ id: 'tournament', header: ot.table.tournament, cell: tournamentCell, align: 'left' },
		{ id: 'white', header: ot.table.white, cell: whiteCell, align: 'left' },
		{
			id: 'whiteElo',
			header: t.pages.tournamentResults.roundByRound.elo,
			cell: whiteEloCell,
			align: 'right',
			noWrap: true
		},
		{ id: 'black', header: ot.table.black, cell: blackCell, align: 'left' },
		{
			id: 'blackElo',
			header: t.pages.tournamentResults.roundByRound.elo,
			cell: blackEloCell,
			align: 'right',
			noWrap: true
		},
		{
			id: 'result',
			header: ot.table.result,
			accessor: 'result',
			align: 'center',
			noWrap: true,
			cellClassName: 'font-mono'
		},
		{ id: 'eloChange', header: elo.eloChange, cell: changeCell, align: 'center', noWrap: true }
	] satisfies TableColumn<GameDisplay>[]);
</script>

{#snippet tournamentCell(game: GameDisplay)}
	<Link
		href="/results/{game.tournamentId}/{game.groupId}"
		class="block max-w-20 truncate md:max-w-48"
	>
		<span title={game.tournamentName}>{game.tournamentName}</span>
	</Link>
{/snippet}

{#snippet side(id: number, name: string)}
	{#if id === memberId}
		<span class="block max-w-16 truncate font-medium md:max-w-36" title={name}>{name}</span>
	{:else}
		<Link href="/players/{id}" class="block max-w-16 truncate md:max-w-36"
			><span title={name}>{name}</span></Link
		>
	{/if}
{/snippet}

{#snippet whiteCell(game: GameDisplay)}{@render side(game.whiteId, game.whiteName)}{/snippet}
{#snippet blackCell(game: GameDisplay)}{@render side(game.blackId, game.blackName)}{/snippet}

{#snippet whiteEloCell(game: GameDisplay)}
	<span class="text-gray-500 tabular-nums dark:text-gray-400">
		{eloAt(game.whiteId, game.groupId)}
	</span>
{/snippet}

{#snippet blackEloCell(game: GameDisplay)}
	<span class="text-gray-500 tabular-nums dark:text-gray-400">
		{eloAt(game.blackId, game.groupId)}
	</span>
{/snippet}

{#snippet changeCell(game: GameDisplay)}
	{@const change = changes.get(game.gameId)}
	{#if change === undefined}-{:else}{change > 0 ? `+${change}` : String(change)}{/if}
{/snippet}

{#snippet figure(label: string, value: string)}
	<div>
		<div class="text-xs text-gray-600 dark:text-gray-400">{label}</div>
		<div class="text-sm font-medium text-gray-900 dark:text-gray-200">{value}</div>
	</div>
{/snippet}

{#if profile.gamesLoading}
	<div class="py-12 text-center">
		<div class="text-lg text-gray-600 dark:text-gray-400">{pd.loadingMatches}</div>
	</div>
{:else if displayGames.length === 0}
	<div class="py-12 text-center">
		<div class="text-lg text-gray-600 dark:text-gray-400">{pd.noMatchesFound}</div>
	</div>
{:else}
	<div class="space-y-4">
		<Table
			data={displayGames}
			{columns}
			emptyMessage={pd.noMatchesFound}
			loadingMessage={pd.loadingMatches}
			getRowKey={(game) => game.gameId}
			hover
			striped={false}
			border
		/>

		{#if summary && summary.playedCount > 0}
			<div class="p-3">
				<div class="mb-3">
					{@render figure(pd.total, `${summary.totalScore} ${pd.of} ${summary.playedCount}`)}
				</div>

				<div class="space-y-2">
					{#each panelTypes as type (type)}
						<div class="grid grid-cols-2 gap-3">
							{@render figure(changeLabels[type], formatEloChange(summary.byRatingType[type]))}
							{@render figure(
								performanceLabels[type],
								formatPerformance(summary.byRatingType[type])
							)}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}
