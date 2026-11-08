<script lang="ts">
	/**
	 * The tabs under a player's profile: their individual events, their team
	 * events, everyone they have played, and — once an opponent is picked — the
	 * head-to-head against them.
	 * Ports `components/player/PlayerHistory.tsx`.
	 *
	 * Tabs, not routes: nothing here is worth a URL, and they share the one load
	 * the page already made. The head-to-head tab appears only once an opponent
	 * has been chosen, and picking a new one switches to it.
	 *
	 * `prependToIndividual` is not carried over — the React version's only
	 * consumer never passed it.
	 */
	import PlayerTournamentList from './PlayerTournamentList.svelte';
	import OpponentsTab from './OpponentsTab.svelte';
	import HeadToHeadTab from './HeadToHeadTab.svelte';
	import TimeControlFilter, { type TimeControl } from './TimeControlFilter.svelte';
	import type { TournamentParticipation } from '$lib/player/participations';
	import { countByTimeControl, filterByTimeControl } from '$lib/player/tournamentTimeControl';
	import { getPlayerProfileState } from '$lib/stores/playerProfile.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	type PlayerTab = 'individual' | 'team' | 'opponents' | 'h2h';

	const profile = getPlayerProfileState();

	let t = $derived(getTranslation(language.current).pages.playerDetail);

	let selected = $state<PlayerTab>('individual');

	/**
	 * The tournament tabs' filter, back to all whenever the tab changes: a tab
	 * should open on its whole list. The Opponents tab has its own.
	 */
	let timeControl = $state<TimeControl>('all');
	function selectTab(tab: PlayerTab) {
		if (tab !== selected) timeControl = 'all';
		selected = tab;
	}

	const TOURNAMENT_OPTIONS: TimeControl[] = [
		'all',
		'standard',
		'rapid',
		'blitz',
		'mixed',
		'unrated'
	];

	/**
	 * Choosing an opponent opens their tab.
	 *
	 * Tracked by comparing against the last id seen rather than by an effect: the
	 * switch is a consequence of the selection changing, and an effect would also
	 * fire on the way back to `null` when the profile reloads.
	 */
	let lastOpponentId = $state<number | null>(null);
	$effect(() => {
		const id = profile.selectedOpponentId;
		if (id === lastOpponentId) return;
		lastOpponentId = id;
		if (id !== null && profile.selectedOpponentName) selected = 'h2h';
		else if (selected === 'h2h') selected = 'individual';
	});

	let tabs = $derived([
		{ id: 'individual' as const, label: t.tabs.individual },
		{ id: 'team' as const, label: t.tabs.team },
		{ id: 'opponents' as const, label: t.tabs.opponents },
		...(profile.selectedOpponentId !== null && profile.selectedOpponentName
			? [{ id: 'h2h' as const, label: profile.selectedOpponentName }]
			: [])
	] satisfies { id: PlayerTab; label: string }[]);
</script>

<div>
	<div class="mb-4 flex border-b border-gray-200 dark:border-gray-700">
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				onclick={() => selectTab(tab.id)}
				class="px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors {selected ===
				tab.id
					? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
					: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}"
			>
				{tab.label}
			</button>
		{/each}
	</div>

	{#if selected === 'individual'}
		{@render tournamentTab(profile.individualTournaments)}
	{:else if selected === 'team'}
		{@render tournamentTab(profile.teamTournaments)}
	{:else if selected === 'opponents'}
		<OpponentsTab />
	{:else if selected === 'h2h' && profile.selectedOpponentId !== null}
		<HeadToHeadTab opponentId={profile.selectedOpponentId} />
	{/if}
</div>

<!-- The filter shows only once there is a loaded list to narrow; loading, an
     error and an empty history keep the list's own messages. -->
{#snippet tournamentTab(rows: TournamentParticipation[])}
	{@const ready = !profile.tournamentsLoading && !profile.gamesFailed && rows.length > 0}
	{@const shown = filterByTimeControl(rows, timeControl)}
	{#if ready}
		<div class="mb-4 flex justify-start">
			<TimeControlFilter
				selected={timeControl}
				onSelect={(value) => (timeControl = value)}
				counts={countByTimeControl(rows)}
				options={TOURNAMENT_OPTIONS}
			/>
		</div>
	{/if}
	{#if ready && shown.length === 0}
		<div class="py-8 text-center">
			<div class="text-gray-600 dark:text-gray-400">{t.tournamentHistory.noTournamentsOfType}</div>
		</div>
	{:else}
		<PlayerTournamentList
			tournaments={shown}
			memberId={profile.memberId}
			loading={profile.tournamentsLoading}
			progress={profile.tournamentsProgress}
			failed={profile.gamesFailed}
		/>
	{/if}
{/snippet}
