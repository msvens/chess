<script lang="ts">
	/**
	 * A player's profile: who they are, how their rating has moved, and everything
	 * they have played.
	 * Ports `players/[memberId]/page.tsx` and the 287-line layout behind it.
	 *
	 * No `+layout.svelte`: the route has no siblings, and the tabs are client
	 * state rather than routes. The state therefore belongs to the page and is
	 * rebuilt when the page is — which is what stops one player's tournaments
	 * showing while the next player's are still loading, a bug the React version
	 * had because its layout outlived the id change.
	 */
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import PlayerInfo from '$lib/components/player/PlayerInfo.svelte';
	import EloRatingChart from '$lib/components/player/EloRatingChart/EloRatingChart.svelte';
	import PlayerHistory from '$lib/components/player/PlayerHistory.svelte';
	import { setPlayerProfileState } from '$lib/stores/playerProfile.svelte';
	import { addRecentPlayer } from '$lib/recentPlayers';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	const profile = setPlayerProfileState();

	let t = $derived(getTranslation(language.current));
	let pd = $derived(t.pages.playerDetail);
	let elo = $derived(t.common.eloLabels);

	let memberId = $derived(Number.parseInt(page.params.memberId ?? '', 10));

	// `untrack` around the call: `load` writes the store's own state, which would
	// otherwise be read back as dependencies of this effect.
	$effect(() => {
		const id = memberId;
		untrack(() => profile.load(id));
	});

	// The recents list on /players is written here, once the player resolves —
	// this is the only place that knows a profile was actually opened.
	$effect(() => {
		const player = profile.player;
		if (!player) return;
		untrack(() =>
			addRecentPlayer({
				id: player.id,
				name: `${player.firstName} ${player.lastName}`,
				club: player.club || undefined
			})
		);
	});
</script>

<svelte:head><title>{profile.currentPlayerName || pd.notFound} — msvens chess</title></svelte:head>

<PageLayout maxWidth="4xl">
	{#if profile.invalidId}
		<div class="text-center">
			<div class="text-lg text-gray-600 dark:text-gray-400">{pd.invalidMemberId}</div>
		</div>
	{:else if profile.playerLoading}
		<div class="text-center">
			<div class="text-lg text-gray-600 dark:text-gray-400">{pd.loading}</div>
		</div>
	{:else if !profile.player}
		<div class="text-center">
			<div class="text-lg text-gray-600 dark:text-gray-400">{pd.notFound}</div>
		</div>
	{:else}
		<div class="mb-6">
			<PlayerInfo player={profile.player} />
		</div>

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

		<div class="mt-8">
			<PlayerHistory />
		</div>
	{/if}
</PageLayout>
