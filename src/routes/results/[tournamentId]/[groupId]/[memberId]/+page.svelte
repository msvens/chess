<script lang="ts">
	/**
	 * One player's games within a group, with what they did to that player's rating.
	 * Ports `results/[tournamentId]/[groupId]/[memberId]/page.tsx`.
	 *
	 * A child of the `[groupId]` layout, so the group's data arrives through
	 * context. The React version fetched the tournament again for the breadcrumb,
	 * and listed the player-cache context object in that effect's dependency
	 * array — and since the cache provider rebuilt its value on every render and
	 * bumped a counter after every write, *every completed player fetch* re-ran
	 * the effect, re-issued the network call and flipped `loading` back on. None
	 * of that can happen here: `playerCache` is a module singleton over a
	 * `SvelteMap`, so it has no identity to depend on and its reads are already
	 * reactive.
	 *
	 * That is also why there is no `historicalDataFetched` gate. The matches are
	 * `$derived` from the round rows and never touch the cache; the cells and the
	 * summary read the cache and update themselves as records land.
	 */
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import Link from '$lib/components/ui/Link.svelte';
	import Table from '$lib/components/ui/Table/Table.svelte';
	import type { TableColumn } from '$lib/components/ui/Table/tableTypes';
	import PlayerInfo from '$lib/components/player/PlayerInfo.svelte';
	import EloRatingChart from '$lib/components/player/EloRatingChart.svelte';
	import { formatPlayerName, formatRatingWithType, type PlayerInfoDto } from '$lib/api';
	import { formatResultCode, formatScore, getResultLabels } from '$lib/results/formatResult';
	import { playerMatchLookups, playerMatches, type PlayerMatch } from '$lib/results/playerMatches';
	import {
		formatEloChange,
		formatPerformance,
		matchRatings,
		ratedGame,
		summarise,
		type RatingType
	} from '$lib/results/tournamentElo';
	import { getGroupResultsState } from '$lib/stores/groupResults.svelte';
	import { playerCache } from '$lib/stores/playerCache.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { localeOf } from '$lib/i18n';
	import { getTranslation } from '$lib/translations';

	const results = getGroupResultsState();

	let t = $derived(getTranslation(language.current));
	let pd = $derived(t.pages.playerDetail);
	let tr = $derived(t.pages.tournamentResults);
	let elo = $derived(t.common.eloLabels);
	let resultLabels = $derived(getResultLabels(t));
	let locale = $derived(localeOf(language.current));

	let tournamentId = $derived(Number.parseInt(page.params.tournamentId ?? '', 10));
	let groupId = $derived(Number.parseInt(page.params.groupId ?? '', 10));
	let memberId = $derived(Number.parseInt(page.params.memberId ?? '', 10));
	let hasMemberId = $derived(Number.isFinite(memberId));

	let standingsUrl = $derived(`/results/${tournamentId}/${groupId}`);

	/** The player as they are now, for the name and the info card. */
	let player = $derived(hasMemberId ? playerCache.get(memberId) : undefined);

	let matches = $derived(
		hasMemberId
			? playerMatches({
					memberId,
					isTeamTournament: results.isTeamTournament,
					individualRoundResults: results.individualRoundResults,
					teamRoundResults: results.teamRoundResults,
					ratedTypeOfRound: (round) => results.getRoundRatedType(round)
				})
			: []
	);

	let summary = $derived(
		summarise(
			matches,
			memberId,
			(playerId, date) => results.getPlayerByDate(playerId, date),
			results.rankingAlgorithm
		)
	);

	let dateRange = $derived.by(() => {
		const start = results.groupStartDate;
		const end = results.groupEndDate;
		if (!start || !end) return '';
		const shown = (value: string) =>
			new Date(value).toLocaleDateString(locale, {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		return start === end ? shown(start) : `${shown(start)} - ${shown(end)}`;
	});

	// --- The summary panel ---
	//
	// The Next version branched into three near-identical layouts by how many
	// rating types had games (none / one / several). They are one list: a row per
	// rated type, or a single dashed row when nothing was rated.

	const changeLabelOf = (type: RatingType) =>
		type === 'rapid' ? elo.rapidEloChange : type === 'blitz' ? elo.blitzEloChange : elo.eloChange;

	const performanceLabelOf = (type: RatingType) =>
		type === 'rapid'
			? elo.rapidPerformance
			: type === 'blitz'
				? elo.blitzPerformance
				: elo.performanceRating;

	let summaryRows = $derived(
		summary.ratedTypes.length === 0
			? [
					{
						key: 'none',
						changeLabel: elo.eloChange,
						change: '-',
						performanceLabel: elo.performanceRating,
						performance: '-'
					}
				]
			: summary.ratedTypes.map((type) => ({
					key: type,
					changeLabel: changeLabelOf(type),
					change: formatEloChange(summary.byRatingType[type]),
					performanceLabel: performanceLabelOf(type),
					performance: formatPerformance(summary.byRatingType[type])
				}))
	);

	// --- The games table ---

	/** The subject player, as they were in the month of a given round. */
	const meAt = (date: number) => results.getPlayerByDate(memberId, date);

	/**
	 * The name shown for a side of the board.
	 *
	 * The player's own name is current, but their *title* is historical — someone
	 * who became an IM mid-season did not hold it in round 1.
	 */
	function nameOf(row: PlayerMatch, side: 'white' | 'black'): string {
		if (row.color === side) {
			return player
				? formatPlayerName(player.firstName, player.lastName, meAt(row.roundDate)?.elo?.title)
				: '';
		}
		return opponentName(row);
	}

	/**
	 * The opponent's name.
	 *
	 * Preserved from the Next app, hardcoded English and all: an unresolved
	 * opponent reads `Player 408550`, and a bye or walkover reads `Player -100`
	 * and links to a route that resolves to nothing. `results.getPlayerName`
	 * would give the translated label and skip the link — msvens knows and wants
	 * parity with the live site for now, so do NOT switch this over.
	 */
	function opponentName(row: PlayerMatch): string {
		const record = results.getPlayerByDate(row.opponentId, row.roundDate);
		if (!record) return `Player ${row.opponentId}`;
		return formatPlayerName(record.firstName, record.lastName, record.elo?.title);
	}

	/**
	 * The rating one side of the board brought to this game.
	 *
	 * One-sided on purpose: `matchRatings` resolves whichever elo it is handed
	 * against the round's own rating type, falling back to the group algorithm,
	 * and reports the type it used. Reading a rating from one side and a type
	 * from the other would drop the "S"/"R"/"B" suffix.
	 */
	function eloOf(row: PlayerMatch, side: 'white' | 'black'): string {
		const record = row.color === side ? meAt(row.roundDate) : opponentRecord(row);
		const { playerRating, ratingType } = matchRatings(
			row,
			record?.elo,
			undefined,
			results.rankingAlgorithm
		);
		return formatRatingWithType(playerRating, ratingType, language.current);
	}

	function opponentRecord(row: PlayerMatch): PlayerInfoDto | undefined {
		return results.getPlayerByDate(row.opponentId, row.roundDate);
	}

	function resultOf(row: PlayerMatch): string {
		if (row.resultCode !== undefined) return formatResultCode(row.resultCode, resultLabels);
		return `${formatScore(row.playerPoints)} - ${formatScore(row.opponentPoints)}`;
	}

	function changeOf(row: PlayerMatch): string {
		const rated = ratedGame(
			row,
			meAt(row.roundDate),
			opponentRecord(row),
			results.rankingAlgorithm
		);
		if (!rated) return '-';
		return rated.change > 0 ? `+${rated.change}` : String(rated.change);
	}

	let columns = $derived<TableColumn<PlayerMatch>[]>([
		{ id: 'round', header: tr.roundByRound.round, accessor: (row) => row.round, noWrap: true },
		{ id: 'white', header: tr.roundByRound.white, cell: whiteCell },
		{
			id: 'whiteElo',
			header: tr.roundByRound.elo,
			accessor: (row) => eloOf(row, 'white'),
			align: 'center',
			noWrap: true
		},
		{ id: 'black', header: tr.roundByRound.black, cell: blackCell },
		{
			id: 'blackElo',
			header: tr.roundByRound.elo,
			accessor: (row) => eloOf(row, 'black'),
			align: 'center',
			noWrap: true
		},
		{
			id: 'result',
			header: tr.roundByRound.result,
			accessor: resultOf,
			align: 'center',
			noWrap: true
			// The Next app set `cellStyle: { fontWeight: 'medium' }` here, which is
			// not a valid CSS font-weight and never applied. Left unstyled so this
			// matches what the live site actually renders.
		},
		{
			id: 'eloChange',
			header: elo.eloChange,
			accessor: changeOf,
			align: 'center',
			noWrap: true
		}
	]);

	// --- Side effects ---

	// The player's own current record, for the name and the info card.
	$effect(() => {
		if (!hasMemberId) return;
		const id = memberId;
		untrack(() => {
			playerCache.fetchByDate(id, Date.now()).catch(() => {});
		});
	});

	// Historical records for the player and every opponent, one month per round.
	$effect(() => {
		const requests = playerMatchLookups(matches, memberId);
		if (requests.length === 0) return;
		untrack(() => {
			results.fetchPlayersByDate(requests).catch(() => {
				// A miss degrades a rating cell to "-"; it must not gate the page,
				// which is what the React version's uncaught rejection did.
			});
		});
	});
</script>

{#snippet playerLink(row: PlayerMatch, side: 'white' | 'black')}
	{#if row.color === side}
		{nameOf(row, side)}
	{:else}
		<!-- Linked unconditionally, including for a bye or walkover id, exactly as
		     the live site does. See `opponentName`. -->
		<Link href="/results/{tournamentId}/{groupId}/{row.opponentId}" color="gray">
			{opponentName(row)}
		</Link>
	{/if}
{/snippet}

{#snippet whiteCell(row: PlayerMatch)}
	{@render playerLink(row, 'white')}
{/snippet}

{#snippet blackCell(row: PlayerMatch)}
	{@render playerLink(row, 'black')}
{/snippet}

<PageLayout maxWidth="3xl">
	{#if !hasMemberId || results.error}
		<div class="text-center">
			<div
				class="rounded-lg border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-dark-bg"
			>
				<h1 class="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-200">{pd.error}</h1>
				<p class="mb-6 text-lg text-gray-600 dark:text-gray-400">
					{hasMemberId ? results.error : pd.invalidMemberId}
				</p>
				<Link href={standingsUrl}>{tr.teamDetailPage.backToStandings}</Link>
			</div>
		</div>
	{:else if results.tournament}
		<div class="mb-6">
			<Link href={standingsUrl} color="blue">
				<span class="text-lg font-medium">{results.tournament.name}</span>
			</Link>
			<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
				{#if results.groupName}{results.groupName},
				{/if}{dateRange}
			</p>
		</div>

		{#if results.loading}
			<div class="mb-8 text-center">
				<div class="text-lg text-gray-600 dark:text-gray-400">{pd.loadingMatches}</div>
			</div>
		{:else}
			<div class="mb-8">
				<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-200">
					{player ? formatPlayerName(player.firstName, player.lastName, player.elo?.title) : ''} - {pd.matches}
				</h2>

				<Table
					data={matches}
					{columns}
					getRowKey={(row) => `${row.round}-${row.opponentId}`}
					emptyMessage={pd.noMatchesFound}
					loadingMessage={pd.loadingMatches}
				/>

				{#if matches.length > 0}
					<div class="mt-3 p-3">
						<div class="mb-3">
							<div class="text-xs text-gray-600 dark:text-gray-400">{pd.total}</div>
							<div class="text-sm font-medium text-gray-900 dark:text-gray-200">
								{summary.totalScore}
								{pd.of}
								{summary.playedCount}
							</div>
						</div>

						<div class="space-y-2">
							{#each summaryRows as row (row.key)}
								<div class="grid grid-cols-2 gap-3">
									<div>
										<div class="text-xs text-gray-600 dark:text-gray-400">{row.changeLabel}</div>
										<div class="text-sm font-medium text-gray-900 dark:text-gray-200">
											{row.change}
										</div>
									</div>
									<div>
										<div class="text-xs text-gray-600 dark:text-gray-400">
											{row.performanceLabel}
										</div>
										<div class="text-sm font-medium text-gray-900 dark:text-gray-200">
											{row.performance}
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			{#if player}
				<div class="mb-6">
					<PlayerInfo {player} />
				</div>
			{/if}

			<div class="mt-8 mb-8">
				<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-200">
					{elo.ratingHistory}
				</h2>
				<EloRatingChart
					{memberId}
					language={language.current}
					ariaLabel={elo.ratingHistory}
					labels={{
						standard: elo.standard,
						rapid: elo.rapid,
						blitz: elo.blitz,
						lask: elo.lask
					}}
					loadingLabel={t.common.states.loading}
					errorLabel={elo.historyError}
					emptyLabel={elo.noHistory}
				/>
			</div>

			<div class="mt-4 text-center">
				<!-- /players/[memberId] does not exist yet; it lands with the player
				     profile slice. The live site has this link too. -->
				<Link href="/players/{memberId}" color="blue" class="text-sm font-medium">
					{pd.viewFullProfile}
				</Link>
			</div>
		{/if}
	{/if}
</PageLayout>
