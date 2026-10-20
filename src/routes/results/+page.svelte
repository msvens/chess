<script lang="ts">
	/**
	 * Tournament search and browse. Ports `app/results/page.tsx`.
	 *
	 * Two independent searches feed one list: a date range (optionally narrowed to
	 * a district) and a free-text search over group names. Whichever ran last owns
	 * the results. A third box is not a search: it opens one group by its SSF id
	 * or a resultat/member.schack.se link, the way SSF itself addresses results.
	 *
	 * The three filters below the divider are client-side, chained so each one's
	 * counts reflect the ones above it: category narrows the set, type counts come
	 * from what category left, and so on.
	 */
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import DatePicker from '$lib/components/ui/DatePicker.svelte';
	import DistrictFilter from '$lib/components/filters/DistrictFilter.svelte';
	import TournamentCategoryFilter from '$lib/components/filters/TournamentCategoryFilter.svelte';
	import TournamentTypeFilter from '$lib/components/filters/TournamentTypeFilter.svelte';
	import TournamentStateFilter from '$lib/components/filters/TournamentStateFilter.svelte';
	import TournamentList from '$lib/components/tournaments/TournamentList.svelte';
	import {
		defaultDateRange,
		deduplicateTournaments,
		groupsToTournaments,
		parseGroupReference,
		sortByUpdated,
		toApiDate
	} from '$lib/components/tournaments/tournamentSearch';
	import { TournamentService, type TournamentDto } from '$lib/api';
	import {
		countByCategory,
		countByState,
		countByType,
		filterByCategory,
		filterByState,
		filterByType,
		type TournamentCategory
	} from '$lib/utils/tournamentFilters';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	const service = new TournamentService();
	const initialRange = defaultDateRange();

	let startDate = $state(initialRange.start);
	let endDate = $state(initialRange.end);
	let districtId = $state<number | null>(null);
	let searchText = $state('');
	let groupText = $state('');
	let groupLoading = $state(false);
	let groupError = $state('');

	let category = $state<TournamentCategory>('all');
	let type = $state<number | null>(null);
	let tournamentState = $state<number | null>(null);

	let tournaments = $state<TournamentDto[]>([]);
	let loading = $state(true);
	let error = $state('');

	let t = $derived(getTranslation(language.current));
	let messages = $derived(t.components.tournamentSearch);

	// Whichever search ran last owns the results; an earlier one finishing late
	// must not overwrite them.
	let token = 0;

	async function runDateSearch(from: string, to: string, district?: number) {
		const mine = ++token;
		loading = true;
		error = '';
		try {
			const response = await service.searchUpdatedTournaments(
				toApiDate(from),
				toApiDate(to),
				district
			);
			if (mine !== token) return;
			if (response.data) {
				tournaments = sortByUpdated(deduplicateTournaments(response.data));
			} else {
				error = response.error || messages.loadFailed;
			}
		} finally {
			if (mine === token) loading = false;
		}
	}

	function searchByDate() {
		if (!startDate || !endDate) {
			error = messages.missingDates;
			return;
		}
		runDateSearch(startDate, endDate, districtId ?? undefined);
	}

	async function searchByText() {
		const query = searchText.trim();
		if (!query) {
			error = messages.missingText;
			return;
		}
		const mine = ++token;
		loading = true;
		error = '';
		try {
			const response = await service.searchGroups(query);
			if (mine !== token) return;
			if (response.data) {
				tournaments = groupsToTournaments(response.data);
			} else {
				error = response.error || messages.searchFailed;
			}
		} finally {
			if (mine === token) loading = false;
		}
	}

	/** Straight to the group's results: there is only ever one hit. */
	async function openGroup() {
		const groupId = parseGroupReference(groupText);
		if (groupId === null) {
			groupError = messages.invalidGroup;
			return;
		}
		groupLoading = true;
		groupError = '';
		try {
			const response = await service.getTournamentFromGroup(groupId);
			if (response.data) {
				await goto(`/results/${response.data.id}/${groupId}`);
			} else if (response.status === 404 || response.status === 204) {
				groupError = messages.groupNotFound.replace('{id}', String(groupId));
			} else {
				groupError = messages.groupLookupFailed;
			}
		} finally {
			groupLoading = false;
		}
	}

	onMount(() => {
		runDateSearch(initialRange.start, initialRange.end);
	});

	// Each stage counts what the stage above it left, so the numbers in each
	// dropdown describe the set that filter would actually act on.
	let categoryCounts = $derived(countByCategory(tournaments));
	let afterCategory = $derived(filterByCategory(tournaments, category));
	let typeCounts = $derived(countByType(afterCategory));
	let afterType = $derived(filterByType(afterCategory, type));
	let stateCounts = $derived(countByState(afterType));
	let visible = $derived(filterByState(afterType, tournamentState));
</script>

<svelte:head><title>{t.pages.results.title} — msvens chess</title></svelte:head>

<PageLayout maxWidth="4xl">
	<PageTitle title={t.pages.results.title} subtitle={t.pages.results.subtitle} />

	<div class="mb-6 space-y-3">
		<div class="flex items-end gap-3">
			<div class="min-w-0 flex-1">
				<DatePicker
					value={startDate}
					onChange={(v) => (startDate = v)}
					fullWidth
					compact
					language={language.current}
				/>
			</div>
			<div class="min-w-0 flex-1">
				<DatePicker
					value={endDate}
					onChange={(v) => (endDate = v)}
					fullWidth
					compact
					language={language.current}
				/>
			</div>
			<div class="min-w-0 flex-1">
				<DistrictFilter
					selectedDistrictId={districtId}
					onSelect={(id) => (districtId = id)}
					variant="dropdown"
					density="compact"
					showLabel={false}
					transparent
				/>
			</div>
			<Button onclick={searchByDate} variant="outlined" disabled={loading} compact>
				{t.common.actions.search}
			</Button>
		</div>

		<div class="flex items-center gap-3">
			<TextField
				value={searchText}
				onChange={(v) => (searchText = v)}
				onEnter={searchByText}
				placeholder={t.pages.results.filters.textSearch.placeholder}
				fullWidth
				compact
			/>
			<Button onclick={searchByText} variant="outlined" disabled={loading} compact>
				{t.common.actions.search}
			</Button>
		</div>

		<div>
			<div class="flex items-center gap-3">
				<TextField
					value={groupText}
					onChange={(v) => (groupText = v)}
					onEnter={openGroup}
					placeholder={t.pages.results.filters.groupLookup.placeholder}
					fullWidth
					compact
				/>
				<Button onclick={openGroup} variant="outlined" disabled={groupLoading} compact>
					{t.pages.results.filters.groupLookup.openButton}
				</Button>
			</div>
			{#if groupError}
				<p class="mt-1 text-sm text-red-600 dark:text-red-400">{groupError}</p>
			{/if}
		</div>
	</div>

	<div class="mb-6 border-t border-gray-200 dark:border-gray-700"></div>

	<div class="mb-6 grid grid-cols-3 gap-4">
		<TournamentCategoryFilter
			selected={category}
			onSelect={(v) => (category = v)}
			counts={categoryCounts}
			density="compact"
			transparent
		/>
		<TournamentTypeFilter
			selected={type}
			onSelect={(v) => (type = v)}
			counts={typeCounts}
			density="compact"
			transparent
		/>
		<TournamentStateFilter
			selected={tournamentState}
			onSelect={(v) => (tournamentState = v)}
			counts={stateCounts}
			density="compact"
			transparent
		/>
	</div>

	<TournamentList
		tournaments={visible}
		{loading}
		{error}
		showUpdatedColumn
		loadingMessage={t.pages.results.wideRangeLoading}
	/>
</PageLayout>
