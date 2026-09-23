<script lang="ts">
	/**
	 * Standings and round-by-round results for one tournament group — the page
	 * this site exists for. Ports `results/[tournamentId]/[groupId]/page.tsx`.
	 *
	 * The data lives in `GroupResultsState`, provided by the layout. What is here
	 * is the view and the three pieces of view state it owns: which round is being
	 * looked at, whether the standings are narrowed to a subset (women, or a side
	 * prize), and whether round playback is on.
	 *
	 * Individual and team events share this page but almost none of their tables:
	 * the branches are wide because a team's standings, snapshots and round
	 * results are all different shapes, not because the two could be unified.
	 */
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import Badge, { type BadgeColor } from '$lib/components/ui/Badge.svelte';
	import Link from '$lib/components/ui/Link.svelte';
	import SelectableList from '$lib/components/ui/SelectableList.svelte';
	import Table from '$lib/components/ui/Table/Table.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import type { TableColumn } from '$lib/components/ui/Table/tableTypes';
	import type { SelectableListItem } from '$lib/components/ui/listItems';
	import ExternalResultsNotice from '$lib/components/results/ExternalResultsNotice.svelte';
	import FinalResultsTable from '$lib/components/results/FinalResultsTable.svelte';
	import LiveUpdatesToggle from '$lib/components/results/LiveUpdatesToggle.svelte';
	import PrizeCategoryFilter from '$lib/components/results/PrizeCategoryFilter.svelte';
	import RegistrationTable from '$lib/components/results/RegistrationTable.svelte';
	import RoundStandingsTable from '$lib/components/results/RoundStandingsTable.svelte';
	import RoundStepper from '$lib/components/results/RoundStepper.svelte';
	import TeamFinalResultsTable from '$lib/components/results/TeamFinalResultsTable.svelte';
	import TeamRoundResults from '$lib/components/results/TeamRoundResults.svelte';
	import TeamRoundStandingsTable from '$lib/components/results/TeamRoundStandingsTable.svelte';
	import {
		getOpponentKind,
		getTournamentStatus,
		hasStandings,
		normalizeEloLookupDate,
		resolvePrizeMembers,
		type TournamentRoundResultDto
	} from '$lib/api';
	import { findClassForGroup, firstGroupOf, flattenClasses } from '$lib/results/classTree';
	import { formatTeamId } from '$lib/results/teamId';
	import { teamNameOrId } from '$lib/results/teamNames';
	import { hasGroupEnded, isSingleDayToday } from '$lib/results/groupDates';
	import { formatIndividualRowResult, getResultLabels } from '$lib/results/formatResult';
	import {
		PRIZE_TYPE_TITLE_KEY,
		availablePrizeTypes,
		findPrizeCategory,
		prizeCategoriesOfType,
		prizeCategoryLabel
	} from '$lib/results/prizeCategories';
	import { createLiveUpdates } from '$lib/results/liveUpdates.svelte';
	import { createRoundStandingsPlayback } from '$lib/results/roundStandingsPlayback.svelte';
	import {
		formatRoundDate,
		groupByRound,
		parseDateToTimestamp,
		playerDateLookups,
		resolveActiveRound,
		roundNumbers
	} from '$lib/results/roundGrouping';
	import { filterContenders, filterPairings, rankSubset } from '$lib/results/subsetRanking';
	import { indexWomen } from '$lib/results/womenFilter';
	import { getGroupResultsState } from '$lib/stores/groupResults.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { localeOf } from '$lib/i18n';
	import { getTranslation } from '$lib/translations';

	const results = getGroupResultsState();

	/** The visitor's explicit round choice; null until they pick one. */
	let selectedRound = $state<number | null>(null);
	/** A prize-giving aid, never the default. */
	let womenOnly = $state(false);
	/** The active side prize, or null for the whole field. Only ever one at a time. */
	let selectedPrizeId = $state<number | null>(null);

	const live = createLiveUpdates({ onRefresh: () => results.refresh() });
	const playback = createRoundStandingsPlayback();

	let t = $derived(getTranslation(language.current));
	let tr = $derived(t.pages.tournamentResults);
	let resultLabels = $derived(getResultLabels(t));
	let locale = $derived(localeOf(language.current));

	let tournamentId = $derived(Number.parseInt(page.params.tournamentId ?? '', 10));
	let groupId = $derived(Number.parseInt(page.params.groupId ?? '', 10));

	let isTeam = $derived(results.isTeamTournament);
	let roundRows = $derived(isTeam ? results.teamRoundResults : results.individualRoundResults);
	let resultsByRound = $derived(
		isTeam
			? new Map<number, TournamentRoundResultDto[]>()
			: groupByRound(results.individualRoundResults)
	);
	let sortedRounds = $derived(roundNumbers(roundRows));

	let activeRound = $derived(resolveActiveRound(selectedRound, sortedRounds));

	let status = $derived(
		results.group
			? getTournamentStatus({
					group: results.group,
					tournament: results.tournament ?? undefined,
					roundResults: roundRows
				})
			: results.tournament
				? getTournamentStatus({ tournament: results.tournament, roundResults: roundRows })
				: 'unknown'
	);
	let isNotStarted = $derived(status === 'upcoming');
	let isFinished = $derived(status === 'finished');

	// --- Standings, or a start list ---
	//
	// Every row carries the NO_PLACE sentinel until a group produces standings, so
	// "rows exist" and "rows are placed" are different questions and the page needs
	// both. Status alone is not enough: a group can be past its start date with
	// nothing published yet — which is a start list, not a standing — while one
	// that has ended without results is neither, and keeps its message.
	let hasRows = $derived(
		isTeam ? results.teamResults.length > 0 : results.individualResults.length > 0
	);
	let placementsExist = $derived(
		isTeam ? hasStandings(results.teamResults) : hasStandings(results.individualResults)
	);
	let groupEnded = $derived(hasGroupEnded(results.groupEndDate, new Date()));
	/** Show the entry list, seeded by rating, rather than a placement table. */
	let showSeedList = $derived(isNotStarted || (hasRows && !placementsExist && !groupEnded));

	// --- Class and group selectors ---

	let allClasses = $derived(flattenClasses(results.tournament));
	let selectedClass = $derived(findClassForGroup(allClasses, groupId));
	let hasMultipleClasses = $derived(allClasses.length > 1);
	let hasMultipleGroups = $derived((selectedClass?.groups?.length ?? 0) > 1);
	/** With nothing to pick between, the group name is redundant beside the heading. */
	let isSingleGroup = $derived(!hasMultipleClasses && !hasMultipleGroups);

	let classItems = $derived<SelectableListItem[]>(
		allClasses.map((cls) => ({
			id: cls.classID,
			label: cls.className || tr.classFallback.replace('{id}', String(cls.classID)),
			tooltip: cls.className
		}))
	);
	let groupItems = $derived<SelectableListItem[]>(
		(selectedClass?.groups ?? []).map((group) => ({
			id: group.id,
			label: group.name,
			tooltip: group.name
		}))
	);

	// --- Standings filters ---
	//
	// Women-only and prize categories both narrow the standings and re-rank
	// within them, and they compose: "top woman in the R2 prize band" is a real
	// question at a prize-giving.

	// Read from the official standings, which is the only place gender appears —
	// round rows and playback snapshots carry contender ids and nothing else.
	let womenIndex = $derived(indexWomen(results.individualResults));
	/**
	 * Hidden rather than disabled when it would do nothing: about 45% of groups
	 * have no women in them, and both degenerate cases — none, or all — make the
	 * toggle meaningless.
	 */
	let womenFilterEligible = $derived(
		!isTeam &&
			!showSeedList &&
			placementsExist &&
			womenIndex.count > 0 &&
			womenIndex.count < womenIndex.total
	);
	// Also covers a stale `womenOnly` carried into a group without the toggle.
	let showWomenOnly = $derived(womenFilterEligible && womenOnly);

	/** Age bands are `tournamentYear - birthYear`, so this is what they measure against. */
	let tournamentYear = $derived.by(() => {
		const year = Number.parseInt(String(results.tournament?.start ?? '').slice(0, 4), 10);
		return Number.isFinite(year) ? year : new Date().getFullYear();
	});

	let prizeTypes = $derived(availablePrizeTypes(results.group));
	// Resolved against the current group rather than kept as a raw object: the
	// page survives a group change, and a stale id must not match the new group.
	let selectedPrize = $derived(findPrizeCategory(results.group, selectedPrizeId));
	let prizeIds = $derived(
		selectedPrize && !isTeam
			? new Set(
					resolvePrizeMembers(selectedPrize, results.individualResults, {
						tournamentYear,
						rankingAlgorithm: results.rankingAlgorithm
					})
				)
			: null
	);

	/** The composed subset, or null when nothing is narrowing the field. */
	let subsetIds = $derived.by(() => {
		const womenIds = showWomenOnly ? womenIndex.ids : null;
		if (womenIds && prizeIds) return new Set([...prizeIds].filter((id) => womenIds.has(id)));
		return womenIds ?? prizeIds;
	});

	// --- Round playback ---

	/**
	 * Team names, built from the *official* standings rather than from snapshot or
	 * round rows — so a club's Roman numerals are the same everywhere, and a school
	 * team resolves at all: only the standings carry its name.
	 */
	let formatTeamName = $derived(teamNameOrId(results.teamResults));
	/**
	 * Restricted to finished events on purpose: while one is running, the
	 * live-updates toggle occupies this spot, and offering "watch it change" and
	 * "scrub back through it" side by side reads as a contradiction. Schackfyran
	 * is excluded because no standings are fetched for it at all.
	 */
	let playbackEligible = $derived(
		isFinished && !results.isIndividuallyPairedTeam && placementsExist && sortedRounds.length >= 2
	);
	let showPlayback = $derived(playbackEligible && playback.enabled);
	let activeSnapshot = $derived(playback.snapshot(groupId, activeRound));

	/**
	 * Badge on the standings heading during playback, driven entirely by the SDK's
	 * per-snapshot flags — no tie-break logic here, and the wording stays neutral
	 * between team and individual. Exact or official standings get no badge; the
	 * explanation lives in the badge's own tooltip.
	 */
	let playbackStatus = $derived.by(
		(): { color: BadgeColor; label: string; tooltip: string } | null => {
			if (!activeSnapshot) return null;
			const pb = tr.standingsPlayback;
			if (activeSnapshot.estimated) {
				return {
					color: 'amber',
					label: pb.estimatedBadge,
					tooltip:
						activeSnapshot.secondaryBasis === 'indicative' ? pb.noteIndicative : pb.noteReproduced
				};
			}
			if (activeSnapshot.secondaryBasis === 'verified') {
				return { color: 'green', label: pb.verifiedBadge, tooltip: pb.verifiedNote };
			}
			return null;
		}
	);

	// --- What the tables actually show ---

	let displayedResults = $derived(
		subsetIds ? filterContenders(results.individualResults, subsetIds) : results.individualResults
	);
	let displayedRank = $derived(
		subsetIds
			? rankSubset(displayedResults, (row) => row.playerInfo?.id ?? row.contenderId)
			: undefined
	);
	let displayedSnapshotRows = $derived(
		subsetIds && activeSnapshot ? filterContenders(activeSnapshot.rows, subsetIds) : null
	);
	let displayedSnapshotRank = $derived(
		// Snapshot ranks legitimately tie, so this ranks by place: 1, 2, 2, 4.
		displayedSnapshotRows
			? rankSubset(
					displayedSnapshotRows,
					(row) => row.contenderId,
					(row) => row.rank
				)
			: undefined
	);
	/**
	 * Pairings follow whatever is narrowing the standings — if you are looking at
	 * who led after R3, their games are the ones you want. A pairing is kept when
	 * either side is in the subset, so the opponent stays visible.
	 */
	let filteredRoundRows = $derived(
		subsetIds && activeRound != null
			? filterPairings(resultsByRound.get(activeRound) ?? [], subsetIds)
			: null
	);
	let roundRowsShown = $derived(
		activeRound == null ? [] : (filteredRoundRows ?? resultsByRound.get(activeRound) ?? [])
	);

	let externalUrl = $derived(`https://resultat.schack.se/ShowTournamentServlet?id=${groupId}`);

	/** Same-day events get a link to the official live view while they are on. */
	let isRunningToday = $derived(
		isSingleDayToday(results.groupStartDate, results.groupEndDate, new Date())
	);

	/** A started group with nothing to show: cancelled, or simply not in yet. */
	let missingResultsMessage = $derived.by(() => {
		if (isNotStarted || results.loading || results.error || !results.groupStartDate) return null;
		if (placementsExist || showSeedList) return null;
		return groupEnded ? 'ended' : 'pending';
	});

	// --- Side effects the store deliberately does not own ---

	/**
	 * Warm the rating cache for the round on screen. Not part of the results load:
	 * it depends on which round is being looked at, which is view state.
	 */
	$effect(() => {
		if (isTeam || activeRound == null || results.loading) return;
		const lookups = playerDateLookups(resultsByRound.get(activeRound));
		if (lookups.length === 0) return;
		untrack(() => results.fetchPlayersByDate(lookups));
	});

	/** Snapshots are fetched only once playback is switched on, and once per group. */
	$effect(() => {
		if (playback.enabled && Number.isFinite(groupId)) playback.ensure(groupId);
	});

	/**
	 * Poll only while the event could still change.
	 *
	 * The React version started the timer unconditionally, so a tournament that
	 * finished years ago still re-fetched its final table every 30 seconds — and
	 * the toggle to stop it is not even rendered for a finished event.
	 */
	$effect(() => {
		if (isFinished) return;
		return untrack(() => live.start());
	});

	function selectClass(id: string | number) {
		const first = firstGroupOf(allClasses.find((cls) => cls.classID === id));
		if (first != null) goto(`/results/${tournamentId}/${first}`);
	}

	/**
	 * Playback starts at round one so the visitor scrubs forward through the
	 * event; the shared round state otherwise sits on the last round.
	 */
	function togglePlayback(enabled: boolean) {
		playback.setEnabled(enabled);
		if (enabled && sortedRounds.length > 0) selectedRound = sortedRounds[0];
	}

	let roundColumns = $derived<TableColumn<TournamentRoundResultDto>[]>([
		{
			id: 'table',
			header: tr.roundByRound.table,
			accessor: (row) => row.board || '-',
			noWrap: true
		},
		{ id: 'white', header: tr.roundByRound.white, cell: playerCell },
		{
			id: 'whiteElo',
			header: tr.roundByRound.elo,
			accessor: (row) => eloAt(row, row.homeId),
			align: 'center',
			noWrap: true
		},
		{ id: 'black', header: tr.roundByRound.black, cell: opponentCell },
		{
			id: 'blackElo',
			header: tr.roundByRound.elo,
			accessor: (row) => eloAt(row, row.awayId),
			align: 'center',
			noWrap: true
		},
		{
			id: 'result',
			header: tr.roundByRound.result,
			accessor: (row) => formatIndividualRowResult(row, resultLabels),
			align: 'center',
			noWrap: true
			// The Next app set `cellStyle: { fontWeight: 'medium' }` here, which is
			// not a valid CSS font-weight and never applied. Left unstyled so this
			// matches what the live site actually renders.
		}
	]);

	/**
	 * The player's rating as it stood at the time of this game.
	 *
	 * Deliberately the *group's* ranking algorithm, not the round's own `rated`
	 * type — verified against resultat.schack.se, which shows the group rating
	 * here even for a rapid- or blitz-rated round inside a standard-ranked group
	 * (checked on groups 17723 and 17014). `getPlayerEloByDateAndRound` exists for
	 * Elo *calculation*, where the round's type is what matters; this column is a
	 * display of the ranking rating and must not use it.
	 */
	function eloAt(row: TournamentRoundResultDto, playerId: number): string {
		return results.getPlayerEloByDate(
			playerId,
			normalizeEloLookupDate(parseDateToTimestamp(row.date))
		);
	}
</script>

{#snippet playerLink(playerId: number)}
	{#if getOpponentKind(playerId) === 'paired'}
		<Link href="/results/{tournamentId}/{groupId}/{playerId}" color="gray">
			{results.getPlayerName(playerId)}
		</Link>
	{:else}
		<!-- A bye or a walkover: there is no player page to go to. -->
		<span class="text-gray-500 dark:text-gray-400">{results.getPlayerName(playerId)}</span>
	{/if}
{/snippet}

{#snippet playerCell(row: TournamentRoundResultDto)}
	{@render playerLink(row.homeId)}
{/snippet}

{#snippet opponentCell(row: TournamentRoundResultDto)}
	{@render playerLink(row.awayId)}
{/snippet}

{#snippet sidebarHeading(text: string, extraClass = '')}
	<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-200 {extraClass}">{text}</h3>
{/snippet}

<PageLayout fullScreen maxWidth="5xl">
	{#if results.error}
		<div class="text-center">
			<div
				class="rounded-lg border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-dark-bg"
			>
				<h1 class="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-200">{tr.error}</h1>
				<p class="mb-6 text-lg text-gray-600 dark:text-gray-400">{results.error}</p>
			</div>
		</div>
	{:else if !results.tournament}
		<!-- Deliberately blank while loading: a spinner here flashes on every
		     navigation between groups, which is the common case. -->
		{#if !results.loading}
			<div class="text-center text-lg text-gray-600 dark:text-gray-400">{tr.notFound}</div>
		{/if}
	{:else}
		<div class="mb-6">
			<h1 class="mb-2 text-2xl font-light text-gray-900 md:text-3xl dark:text-gray-200">
				{results.tournament.name}
			</h1>
			<div class="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
				<span>{results.tournament.start} - {results.tournament.end}</span>
				{#if results.tournament.city}<span>{results.tournament.city}</span>{/if}
			</div>
			<div class="mt-3 text-sm">
				<a
					href="/print/{tournamentId}/{groupId}"
					target="_blank"
					rel="noopener noreferrer"
					class="text-blue-600 hover:underline dark:text-blue-400"
				>
					{tr.print.printThisGroup}
				</a>
			</div>
		</div>

		<div class="flex flex-col gap-4 lg:flex-row lg:gap-6">
			{#if hasMultipleClasses || hasMultipleGroups}
				<!-- Headings are rendered here rather than through SelectableList's own
				     `title`, whose vertical variant wraps them in the list's padding and
				     drops them out of line with the standings heading beside it. -->
				<div class="hidden w-56 flex-shrink-0 space-y-4 lg:block">
					{#if hasMultipleClasses}
						<div>
							{@render sidebarHeading(tr.classes)}
							<SelectableList
								items={classItems}
								selectedId={selectedClass?.classID ?? null}
								onSelect={selectClass}
								variant="dropdown"
								showTitle={false}
								placeholder={t.components.selectableList.selectPlaceholder}
							/>
						</div>
					{/if}
					{#if hasMultipleGroups}
						<div>
							{@render sidebarHeading(tr.groups, 'px-2')}
							<SelectableList
								items={groupItems}
								selectedId={groupId}
								onSelect={(id) => goto(`/results/${tournamentId}/${id}`)}
								variant="vertical"
								showTitle={false}
								placeholder={t.components.selectableList.selectPlaceholder}
								class="-mt-2"
							/>
						</div>
					{/if}
				</div>
			{/if}

			<div class="min-w-0 flex-1 lg:pr-2">
				<div class="mb-4 space-y-2 lg:hidden">
					{#if hasMultipleClasses}
						<SelectableList
							items={classItems}
							selectedId={selectedClass?.classID ?? null}
							onSelect={selectClass}
							title={tr.classes}
							variant="dropdown"
							density="compact"
							transparent
							placeholder={t.components.selectableList.selectPlaceholder}
						/>
					{/if}
					{#if hasMultipleGroups}
						<SelectableList
							items={groupItems}
							selectedId={groupId}
							onSelect={(id) => goto(`/results/${tournamentId}/${id}`)}
							title={tr.groups}
							variant="dropdown"
							density="compact"
							transparent
							placeholder={t.components.selectableList.selectPlaceholder}
						/>
					{/if}
				</div>

				{#if !results.group}
					<div
						class="rounded-lg border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-dark-bg"
					>
						<p class="text-gray-600 dark:text-gray-400">{tr.selectGroup}</p>
					</div>
				{:else if results.isIndividuallyPairedTeam}
					<!-- Schackfyran and friends: upstream has no team-standings endpoint
					     for this format, so nothing was fetched and the notice is the
					     whole page. -->
					<ExternalResultsNotice
						prefix={tr.externalNotice.individuallyPairedTeam.prefix}
						linkLabel={tr.externalNotice.individuallyPairedTeam.linkLabel}
						suffix={tr.externalNotice.individuallyPairedTeam.suffix}
						url={externalUrl}
					/>
				{:else}
					{#if !results.loading}
						<div class="mb-6">
							<!-- Top-aligned rather than centred: the left column can carry
							     extra lines under the heading, and centring would drop the
							     controls between them instead of onto the heading's line. -->
							<div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-200">
										{#if showPlayback}
											{tr.standingsPlayback.titleTemplate.replace(
												'{round}',
												String(activeRound ?? '')
											)}
										{:else if showSeedList}
											{tr.registrationTable.title}
										{:else if isFinished}
											{tr.finalResults}
										{:else}
											{tr.ongoingResults}
										{/if}{#if !isSingleGroup}{` - ${results.group.name}`}{/if}
										{#if showPlayback && playbackStatus}
											<Badge
												color={playbackStatus.color}
												tooltip={playbackStatus.tooltip}
												class="ml-2">{playbackStatus.label}</Badge
											>
										{/if}
										{#if selectedPrize && prizeIds}
											<!-- Name the prize, so a shortened table is never read as
											     the full standings. -->
											<Badge color="purple" class="ml-2">
												{prizeCategoryLabel(selectedPrize)}
											</Badge>
										{/if}
									</h3>
									{#if isNotStarted && results.groupStartDate}
										<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
											{tr.tournamentStatus.groupStarts}
											{results.groupStartDate}
										</p>
									{/if}
									{#if results.thinkingTime}
										<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
											{results.thinkingTime}
										</p>
									{/if}
								</div>

								{#if !isFinished || playbackEligible || womenFilterEligible}
									<div class="flex flex-col items-start gap-2 sm:flex-shrink-0 sm:items-end">
										{#if !isFinished}
											<LiveUpdatesToggle
												enabled={live.enabled}
												onToggle={(next) => live.setEnabled(next)}
												lastUpdated={results.lastUpdated}
												isRefreshing={live.isRefreshing}
												onManualRefresh={() => live.refresh()}
											/>
										{/if}
										{#if playbackEligible || womenFilterEligible}
											<!-- Both view toggles share a row and wrap on a narrow
											     screen. `min-h` matches the heading's line box so a
											     single row centres on it rather than sitting high. -->
											<div
												class="flex flex-wrap items-center justify-start gap-x-5 gap-y-2 sm:min-h-7 sm:justify-end"
											>
												{#if playbackEligible}
													<Toggle
														checked={playback.enabled}
														onChange={togglePlayback}
														label={tr.standingsPlayback.toggleLabel}
													/>
												{/if}
												{#if womenFilterEligible}
													<Toggle
														checked={womenOnly}
														onChange={(next) => (womenOnly = next)}
														label="{tr.womenFilter.toggleLabel} ({womenIndex.count})"
													/>
												{/if}
											</div>
										{/if}
									</div>
								{/if}
							</div>

							{#if isRunningToday}
								<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
									<a
										href={externalUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="underline hover:text-gray-900 dark:hover:text-gray-200"
									>
										{tr.tournamentStatus.liveResultsLink} &rarr;
									</a>
								</p>
							{/if}

							{#if !isTeam && !showSeedList && prizeTypes.length > 0}
								<!-- One dropdown per prize type the group actually offers;
								     absent for the large majority of tournaments. -->
								<div class="mb-4 flex flex-wrap items-end gap-3">
									{#each prizeTypes as type (type)}
										<PrizeCategoryFilter
											categories={prizeCategoriesOfType(results.group, type)}
											selectedId={selectedPrize?.type === type ? selectedPrize.id : null}
											onSelect={(id) => (selectedPrizeId = id)}
											title={tr.prizeCategories[PRIZE_TYPE_TITLE_KEY[type]]}
											allLabel={tr.prizeCategories.all}
											density="compact"
										/>
									{/each}
								</div>
							{/if}

							{#if missingResultsMessage === 'ended'}
								<div class="p-8 text-center">
									<div class="mb-2 text-lg font-medium text-gray-900 dark:text-gray-200">
										{tr.tournamentStatus.noResultsAvailable}
									</div>
									<div class="text-gray-600 dark:text-gray-400">
										{tr.tournamentStatus.groupCancelled}
									</div>
								</div>
							{:else if missingResultsMessage === 'pending'}
								<div class="p-8 text-center">
									<div class="text-gray-600 dark:text-gray-400">
										{tr.tournamentStatus.resultsComing}
									</div>
								</div>
							{/if}

							{#if showPlayback && !playback.failed(groupId)}
								<div>
									<RoundStepper
										rounds={sortedRounds}
										value={activeRound ?? sortedRounds[sortedRounds.length - 1]}
										onChange={(round) => (selectedRound = round)}
										labelPrefix={tr.roundByRound.round}
										prevLabel={tr.standingsPlayback.prevRound}
										nextLabel={tr.standingsPlayback.nextRound}
										class="mb-4"
									/>
									{#if playback.loading && !activeSnapshot}
										<div class="p-8 text-center text-gray-600 dark:text-gray-400">
											{tr.loading}
										</div>
									{:else if isTeam}
										<TeamRoundStandingsTable
											rows={activeSnapshot?.rows ?? []}
											{formatTeamName}
											onRowClick={(row) =>
												goto(
													`/results/${tournamentId}/${groupId}/team/${formatTeamId(
														row.contenderId,
														// A snapshot row's team number is optional in the SDK's
														// type; the sibling table already displays it as 0 when
														// absent, so the link agrees rather than interpolating
														// `undefined` into the URL as the Next version did.
														row.teamNumber ?? 0
													)}`
												)}
										/>
									{:else}
										<RoundStandingsTable
											rows={displayedSnapshotRows ?? activeSnapshot?.rows ?? []}
											playerMap={results.playerMap}
											rankingAlgorithm={results.rankingAlgorithm}
											onRowClick={(row) =>
												goto(`/results/${tournamentId}/${groupId}/${row.contenderId}`)}
											subsetRank={displayedSnapshotRank}
										/>
									{/if}
								</div>
							{:else}
								{#if playback.enabled && playback.failed(groupId)}
									<p class="mb-3 text-xs text-amber-600 dark:text-amber-400">
										{tr.standingsPlayback.loadError}
									</p>
								{/if}
								{#if isTeam}
									{#if results.teamResults.length > 0 || results.error}
										<TeamFinalResultsTable
											results={results.teamResults}
											error={results.error ?? undefined}
											onRowClick={(row) =>
												goto(
													`/results/${tournamentId}/${groupId}/team/${formatTeamId(row.contenderId, row.teamNumber)}`
												)}
										/>
									{/if}
								{:else if showSeedList}
									<RegistrationTable
										results={results.individualResults}
										rankingAlgorithm={results.rankingAlgorithm}
										onRowClick={(row) =>
											row.playerInfo?.id &&
											goto(`/results/${tournamentId}/${groupId}/${row.playerInfo.id}`)}
									/>
								{:else if placementsExist}
									<FinalResultsTable
										results={displayedResults}
										rankingAlgorithm={results.rankingAlgorithm}
										onRowClick={(row) =>
											row.playerInfo?.id &&
											goto(`/results/${tournamentId}/${groupId}/${row.playerInfo.id}`)}
										subsetRank={displayedRank}
									/>
								{/if}
							{/if}
						</div>

						{#if !isNotStarted && isTeam}
							{#if results.teamRoundResults.length > 0}
								<TeamRoundResults
									roundResults={results.teamRoundResults}
									{formatTeamName}
									getPlayerName={(playerId, date) => results.getPlayerName(playerId, date)}
									getPlayerEloByDate={(playerId, date) =>
										results.getPlayerEloByDate(playerId, date)}
									fetchPlayersByDate={(requests) => results.fetchPlayersByDate(requests)}
									{tournamentId}
									{groupId}
								/>
							{/if}
						{:else if !isNotStarted}
							<div
								class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-dark-bg"
							>
								<div class="border-b border-gray-200 p-4 md:p-6 dark:border-gray-700">
									<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-200">
										{tr.roundByRound.title}
										<!-- The controls sit up by the standings, often scrolled out
										     of view — naming every active filter here stops missing
										     pairings being a mystery. -->
										{#if showWomenOnly}
											<Badge color="blue" class="ml-2">{tr.womenFilter.toggleLabel}</Badge>
										{/if}
										{#if selectedPrize && prizeIds}
											<Badge color="purple" class="ml-2">
												{prizeCategoryLabel(selectedPrize)}
											</Badge>
										{/if}
									</h3>
								</div>

								{#if results.individualRoundResults.length === 0}
									<div class="p-6 text-center">
										<div class="text-gray-600 dark:text-gray-400">{tr.roundByRound.noResults}</div>
									</div>
								{:else}
									<div class="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
										{#each sortedRounds as round (round)}
											{@const active = activeRound === round}
											<!-- The played date where there is one, the scheduled date
											     otherwise — a future round has only the latter. -->
											{@const dateLabel = formatRoundDate(
												resultsByRound.get(round)?.[0]?.date ??
													results.roundsMap.get(round)?.roundDate,
												locale
											)}
											<button
												type="button"
												onclick={() => (selectedRound = round)}
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
										<Table
											data={roundRowsShown}
											columns={roundColumns}
											getRowKey={(row, index) => `${row.homeId}-${row.awayId}-${index}`}
											emptyMessage={filteredRoundRows
												? tr.roundByRound.noFilteredResults
												: tr.roundByRound.noResults}
											loadingMessage={tr.loading}
										/>
									</div>
								{/if}
							</div>
						{/if}
					{/if}
				{/if}
			</div>
		</div>
	{/if}
</PageLayout>
