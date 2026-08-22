<script lang="ts">
	/**
	 * Find a player. Ports `app/players/page.tsx`.
	 *
	 * Three ways in, because SSF exposes three: a name search that returns a list
	 * to pick from, and two id lookups that go straight to a profile. The id
	 * lookups fetch the player only to check the id exists — the profile then
	 * fetches it again. That is what produces the inline "not found" message
	 * here, so it stays until the profile route can validate for itself.
	 */
	import { goto } from '$app/navigation';
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import PlayerSearchInput from '$lib/components/player/PlayerSearchInput.svelte';
	import { getRecentPlayers } from '$lib/recentPlayers';
	import { PlayerService } from '$lib/api';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	const players = new PlayerService();

	// Read once at mount: the SPA re-runs this every time the route is entered,
	// which is exactly when the list can have changed.
	const recentPlayers = getRecentPlayers();

	let memberId = $state('');
	let memberIdError = $state('');
	let memberIdLoading = $state(false);

	let fideId = $state('');
	let fideIdError = $state('');
	let fideIdLoading = $state(false);

	let t = $derived(getTranslation(language.current));

	/** Go to a player's profile if the id resolves; say so inline if it does not. */
	async function lookup(
		raw: string,
		fetchPlayer: (id: number) => Promise<{ status: number; data?: { id: number } }>,
		setError: (message: string) => void,
		setLoading: (loading: boolean) => void
	) {
		const id = parseInt(raw.trim(), 10);
		if (Number.isNaN(id)) return;

		setError('');
		setLoading(true);
		const response = await fetchPlayer(id);
		setLoading(false);

		if (response.status === 200 && response.data) {
			goto(`/players/${response.data.id}`);
		} else {
			setError(t.pages.players.search.playerNotFound);
		}
	}

	const searchMemberId = () =>
		lookup(
			memberId,
			(id) => players.getPlayerInfo(id),
			(message) => (memberIdError = message),
			(loading) => (memberIdLoading = loading)
		);

	const searchFideId = () =>
		lookup(
			fideId,
			(id) => players.getPlayerByFIDEId(id),
			(message) => (fideIdError = message),
			(loading) => (fideIdLoading = loading)
		);
</script>

<PageLayout fullScreen maxWidth="3xl">
	<PageTitle title={t.pages.players.title} subtitle={t.pages.players.subtitle} />

	<div class="mb-12 space-y-4">
		<PlayerSearchInput
			onSelect={(player) => goto(`/players/${player.id}`)}
			placeholder={t.pages.players.search.namePlaceholder}
			label={t.pages.players.search.byName}
			noResultsMessage={t.pages.players.search.nameSearchHint}
			helperText={t.pages.players.search.nameSearchHelper}
			searchLabel={t.common.actions.search}
			fullWidth
		/>

		<div>
			<span class="mb-1 block text-xs text-gray-600 dark:text-gray-400">
				{t.pages.players.search.byMemberId}
			</span>
			<div class="flex gap-2">
				<TextField
					value={memberId}
					onChange={(value) => {
						memberId = value;
						memberIdError = '';
					}}
					placeholder={t.pages.players.search.memberIdPlaceholder}
					type="number"
					fullWidth
					onEnter={searchMemberId}
				/>
				<Button
					onclick={searchMemberId}
					disabled={memberIdLoading || !memberId.trim()}
					variant="outlined"
				>
					{memberIdLoading ? '...' : t.common.actions.search}
				</Button>
			</div>
			{#if memberIdError}
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{memberIdError}</p>
			{/if}
		</div>

		<div>
			<span class="mb-1 block text-xs text-gray-600 dark:text-gray-400">
				{t.pages.players.search.byFideId}
			</span>
			<div class="flex gap-2">
				<TextField
					value={fideId}
					onChange={(value) => {
						fideId = value;
						fideIdError = '';
					}}
					placeholder={t.pages.players.search.fideIdPlaceholder}
					type="number"
					fullWidth
					onEnter={searchFideId}
				/>
				<Button
					onclick={searchFideId}
					disabled={fideIdLoading || !fideId.trim()}
					variant="outlined"
				>
					{fideIdLoading ? '...' : t.common.actions.search}
				</Button>
			</div>
			{#if fideIdError}
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{fideIdError}</p>
			{/if}
		</div>
	</div>

	{#if recentPlayers.length > 0}
		<div>
			<h3 class="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-200">
				{t.pages.players.recentPlayers}
			</h3>
			<div class="space-y-1">
				{#each recentPlayers as player (player.id)}
					<div>
						<button
							type="button"
							onclick={() => goto(`/players/${player.id}`)}
							class="text-sm text-blue-600 hover:underline dark:text-blue-400"
						>
							{player.name}{player.club ? `, ${player.club}` : ''}
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</PageLayout>
