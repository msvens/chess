<script lang="ts">
	/**
	 * Round-by-round results for a team tournament: one row per match, expandable
	 * to its boards. Ports `components/results/TeamRoundResults.tsx`.
	 *
	 * Board ratings are historical, and fetching them for every match of every
	 * round would be hundreds of requests — so they are fetched for one match at a
	 * time, when it is opened.
	 */
	import { untrack } from 'svelte';
	import { ChevronDown, Icon } from 'svelte-hero-icons';
	import Link from '$lib/components/ui/Link.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import type { TableColumn } from '$lib/components/ui/tableTypes';
	import {
		createRoundResultsTeamNameFormatter,
		getOpponentKind,
		normalizeEloLookupDate,
		type TournamentRoundResultDto
	} from '$lib/api';
	import {
		formatBoardResult,
		formatTeamMatchScore,
		getResultLabels
	} from '$lib/results/formatResult';
	import {
		formatRoundDate,
		parseDateToTimestamp,
		resolveActiveRound
	} from '$lib/results/roundGrouping';
	import {
		boardGames,
		boardPlayerIds,
		groupMatchesByRound,
		type BoardGame,
		type TeamMatch
	} from '$lib/results/teamMatches';
	import { localeOf } from '$lib/i18n';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface TeamRoundResultsProps {
		roundResults: TournamentRoundResultDto[];
		getClubName: (clubId: number) => string;
		getPlayerName: (playerId: number, date?: number) => string;
		getPlayerEloByDate: (playerId: number, date: number) => string;
		fetchPlayersByDate: (requests: { playerId: number; date: number }[]) => Promise<void>;
		tournamentId: number;
		groupId: number;
	}

	let {
		roundResults,
		getClubName,
		getPlayerName,
		getPlayerEloByDate,
		fetchPlayersByDate,
		tournamentId,
		groupId
	}: TeamRoundResultsProps = $props();

	/**
	 * The open match, by pairing rather than by list position. The React version
	 * held an array index, so a live refresh that reordered the round's matches
	 * left a different match expanded than the one that was clicked.
	 */
	let expandedKey = $state<string | null>(null);
	let selectedRound = $state<number | null>(null);

	let t = $derived(getTranslation(language.current));
	let tr = $derived(t.pages.tournamentResults);
	let resultLabels = $derived(getResultLabels(t));
	let locale = $derived(localeOf(language.current));

	let matchesByRound = $derived(groupMatchesByRound(roundResults));
	let sortedRounds = $derived([...matchesByRound.keys()].sort((a, b) => a - b));
	let activeRound = $derived(resolveActiveRound(selectedRound, sortedRounds));
	let matches = $derived(activeRound == null ? [] : (matchesByRound.get(activeRound) ?? []));

	let formatTeamName = $derived(createRoundResultsTeamNameFormatter(roundResults, getClubName));

	/** Byes and walkovers occupy a team slot but have no club to name. */
	function teamLabel(id: number, teamNumber: number): string {
		switch (getOpponentKind(id)) {
			case 'bye':
				return tr.bye;
			case 'walkover':
				return tr.walkover;
			default:
				return formatTeamName(id, teamNumber);
		}
	}

	let expandedMatch = $derived(matches.find((match) => match.key === expandedKey) ?? null);
	let expandedBoards = $derived(expandedMatch ? boardGames(expandedMatch) : []);

	/**
	 * The month whose rating list applies to the open match. A match dated in the
	 * future — a scheduled round — falls back to the current list.
	 */
	function lookupDateOf(match: TeamMatch): number {
		const raw = parseDateToTimestamp(match.date);
		return normalizeEloLookupDate(Number.isNaN(raw) || raw <= 0 ? Date.now() : raw);
	}

	let expandedDate = $derived(expandedMatch ? lookupDateOf(expandedMatch) : null);

	// Warm the rating cache for the match that was just opened.
	$effect(() => {
		if (!expandedMatch || expandedDate == null) return;
		const ids = boardPlayerIds(expandedBoards);
		if (ids.length === 0) return;
		const requests = ids.map((playerId) => ({ playerId, date: expandedDate }));
		untrack(() => fetchPlayersByDate(requests));
	});

	function toggle(key: string) {
		expandedKey = expandedKey === key ? null : key;
	}

	function selectRound(round: number) {
		selectedRound = round;
		// The open match belongs to the round being left.
		expandedKey = null;
	}

	let boardColumns = $derived<TableColumn<BoardGame>[]>([
		{
			id: 'board',
			header: tr.teamRoundResults.board,
			accessor: (game) => game.boardNumber || '-',
			noWrap: true
		},
		{
			id: 'homePlayer',
			header: expandedMatch ? teamLabel(expandedMatch.homeId, expandedMatch.homeTeamNumber) : '',
			headerClassName: 'max-w-[10ch] sm:max-w-none truncate',
			cell: homePlayerCell
		},
		{
			id: 'homeElo',
			header: tr.teamRoundResults.elo,
			accessor: (game) => eloOf(game.homePlayerId),
			align: 'center',
			noWrap: true
		},
		{
			id: 'awayPlayer',
			header: expandedMatch ? teamLabel(expandedMatch.awayId, expandedMatch.awayTeamNumber) : '',
			headerClassName: 'max-w-[10ch] sm:max-w-none truncate',
			cell: awayPlayerCell
		},
		{
			id: 'awayElo',
			header: tr.teamRoundResults.elo,
			accessor: (game) => eloOf(game.awayPlayerId),
			align: 'center',
			noWrap: true
		},
		{
			id: 'result',
			header: tr.teamRoundResults.result,
			accessor: (game) => formatBoardResult(game, resultLabels),
			align: 'center',
			noWrap: true
			// The Next app set `cellStyle: { fontWeight: 'medium' }` here, which is
			// not a valid CSS font-weight and never applied. Left unstyled so this
			// matches what the live site actually renders.
		}
	]);

	function eloOf(playerId: number): string {
		if (getOpponentKind(playerId) !== 'paired' || expandedDate == null) return '-';
		return getPlayerEloByDate(playerId, expandedDate);
	}
</script>

{#snippet playerName(playerId: number)}
	{#if getOpponentKind(playerId) === 'paired'}
		<Link href="/results/{tournamentId}/{groupId}/{playerId}" color="gray">
			{getPlayerName(playerId, expandedDate ?? undefined)}
		</Link>
	{:else}
		<span class="text-gray-500 dark:text-gray-400">
			{getOpponentKind(playerId) === 'bye' ? tr.bye : tr.walkover}
		</span>
	{/if}
{/snippet}

{#snippet homePlayerCell(game: BoardGame)}
	{@render playerName(game.homePlayerId)}
{/snippet}

{#snippet awayPlayerCell(game: BoardGame)}
	{@render playerName(game.awayPlayerId)}
{/snippet}

{#if sortedRounds.length === 0}
	<div class="p-6 text-center">
		<div class="text-gray-600 dark:text-gray-400">{tr.roundByRound.noResults}</div>
	</div>
{:else}
	<div
		class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-dark-bg"
	>
		<div class="border-b border-gray-200 p-4 md:p-6 dark:border-gray-700">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-200">
				{tr.roundByRound.title}
			</h3>
		</div>

		<div class="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
			{#each sortedRounds as round (round)}
				{@const active = activeRound === round}
				<!-- The date the round's first match carries. `TeamRoundResults.tsx`
				     has a TODO to fall back to the group's scheduled `roundDate` the
				     way the individual page does — deliberately not taken: measured
				     across 44 team groups, the API always dates these rows, even for
				     rounds not yet played, so the fallback would never render. -->
				{@const dateLabel = formatRoundDate(matchesByRound.get(round)?.[0]?.date, locale)}
				<button
					type="button"
					onclick={() => selectRound(round)}
					class="flex-shrink-0 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors {active
						? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
						: 'text-gray-600 dark:text-gray-400'}"
				>
					<div>{tr.roundByRound.round} {round}</div>
					{#if dateLabel}
						<div
							class="text-xs {active
								? 'text-blue-500 dark:text-blue-300'
								: 'text-gray-500 dark:text-gray-500'}"
						>
							{dateLabel}
						</div>
					{/if}
				</button>
			{/each}
		</div>

		<div class="p-4 md:p-6">
			<div class="space-y-2">
				{#each matches as match (match.key)}
					{@const open = expandedKey === match.key}
					<div class="overflow-hidden">
						<button
							type="button"
							onclick={() => toggle(match.key)}
							aria-expanded={open}
							class="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
						>
							<div class="flex items-center justify-between">
								<div class="flex-1">
									<span class="font-medium text-gray-900 dark:text-gray-200">
										{teamLabel(match.homeId, match.homeTeamNumber)}
									</span>
									<span class="mx-2 text-gray-500 dark:text-gray-400">-</span>
									<span class="font-medium text-gray-900 dark:text-gray-200">
										{teamLabel(match.awayId, match.awayTeamNumber)}
									</span>
								</div>
								<div class="ml-4 flex items-center gap-2">
									<span class="font-medium text-gray-900 dark:text-gray-200">
										{formatTeamMatchScore(match, resultLabels)}
									</span>
									<Icon
										src={ChevronDown}
										class="h-4 w-4 text-gray-400 transition-transform {open ? 'rotate-180' : ''}"
										aria-hidden="true"
									/>
								</div>
							</div>
						</button>

						{#if open}
							<div
								class="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
							>
								<div class="p-4">
									<Table
										data={expandedBoards}
										columns={boardColumns}
										getRowKey={(game, index) => `${game.boardNumber}-${index}`}
										emptyMessage={tr.roundByRound.noResults}
										loadingMessage={tr.loading}
										density="compact"
									/>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
