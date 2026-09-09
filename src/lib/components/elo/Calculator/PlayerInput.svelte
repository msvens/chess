<script lang="ts">
	/**
	 * One side of the board: a rating typed by hand, or a player looked up six
	 * ways. Ports the `PlayerInput` half of `app/elo/calculator/page.tsx`.
	 *
	 * The parent owns the selection (rating text, or the looked-up player) and
	 * the Elo type; this owns the input mode and the lookup plumbing. The rating
	 * shown for the chosen Elo type is derived here and in the parent from the
	 * same `selectedRating`, so switching type never has to refetch or re-sync.
	 */
	import TextField from '$lib/components/ui/TextField.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import PlayerSearchInput from '$lib/components/player/PlayerSearchInput.svelte';
	import FidePlayerSearchInput from '$lib/components/player/FidePlayerSearchInput.svelte';
	import { PlayerService, fideService, type FideActivePlayer } from '$lib/api';
	import { formatFideActivePlayerName } from '$lib/fideNames';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import {
		INPUT_MODES,
		fromFideActivePlayer,
		fromFidePlayerInfo,
		fromFideSearchHit,
		fromSsfPlayer,
		selectedRating,
		type EloType,
		type InputMode,
		type LookedUpPlayer,
		type PlayerSelection
	} from './calculator';

	interface PlayerInputProps {
		label: string;
		eloType: EloType;
		selection: PlayerSelection;
		onChange: (selection: PlayerSelection) => void;
		topPlayers: FideActivePlayer[];
		topPlayersLoading: boolean;
	}

	let { label, eloType, selection, onChange, topPlayers, topPlayersLoading }: PlayerInputProps =
		$props();

	const players = new PlayerService();

	let inputMode = $state<InputMode>('manual');
	let memberIdInput = $state('');
	let fideIdInput = $state('');
	let topPlayerId = $state('');
	let searching = $state(false);
	let lookupError = $state('');

	// Bumped by every lookup and every mode switch, so a response that arrives
	// after the user has moved on is dropped rather than applied. The Next app
	// applied it — its enrich step closed over stale state and overwrote whatever
	// had happened since.
	let generation = 0;

	let t = $derived(getTranslation(language.current));
	let calc = $derived(t.pages.elo.calculator);
	let active = $derived(selectedRating(selection, eloType));

	let modeLabels = $derived<Record<InputMode, string>>({
		manual: calc.manualInput,
		ssfId: calc.ssfId,
		ssfSearch: calc.ssfSearch,
		fideId: calc.fideId,
		fideSearch: calc.fideSearch,
		topPlayer: calc.topPlayers
	});

	const tabClasses = {
		selected: 'bg-gray-200 font-medium text-gray-900 dark:bg-gray-700 dark:text-gray-200',
		idle: 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
	} as const;

	/**
	 * Carry the rating on show into the manual field, but drop everything else
	 * the lookup brought: the profile K and, above all, a FIDE birth year, which
	 * in the Next app survived into manual input and gave a typed rating K=40.
	 */
	function switchMode(mode: InputMode) {
		generation++;
		inputMode = mode;
		lookupError = '';
		searching = false;
		topPlayerId = '';
		onChange({
			manualRating: active ? String(active.rating) : selection.manualRating,
			lookedUp: null
		});
	}

	function setLookedUp(player: LookedUpPlayer) {
		onChange({ ...selection, lookedUp: player });
	}

	async function lookup(raw: string, fetch: () => Promise<LookedUpPlayer | null>) {
		if (Number.isNaN(parseInt(raw.trim(), 10))) return;
		const mine = ++generation;
		searching = true;
		lookupError = '';
		const player = await fetch();
		if (mine !== generation) return;
		searching = false;
		if (player) setLookedUp(player);
		else lookupError = calc.playerNotFound;
	}

	const lookupSsfId = () =>
		lookup(memberIdInput, async () => {
			const response = await players.getPlayerInfo(parseInt(memberIdInput.trim(), 10));
			return response.status === 200 && response.data ? fromSsfPlayer(response.data) : null;
		});

	const lookupFideId = () =>
		lookup(fideIdInput, async () => {
			const response = await fideService.getPlayerInfo(parseInt(fideIdInput.trim(), 10), true);
			return response.status === 200 && response.data ? fromFidePlayerInfo(response.data) : null;
		});

	/**
	 * A list row knows the name and the classical rating; show that at once,
	 * then fill in rapid, blitz and the birth year from the profile. If the
	 * profile fails the row's data stands, with no error.
	 */
	async function enrich(fallback: LookedUpPlayer, fideId: number) {
		setLookedUp(fallback);
		if (Number.isNaN(fideId)) return;
		const mine = ++generation;
		searching = true;
		const response = await fideService.getPlayerInfo(fideId, true);
		if (mine !== generation) return;
		searching = false;
		if (response.status === 200 && response.data) setLookedUp(fromFidePlayerInfo(response.data));
	}

	function chooseTopPlayer() {
		const player = topPlayers.find((p) => p.fide_id === topPlayerId);
		if (player) enrich(fromFideActivePlayer(player), parseInt(player.fide_id, 10));
	}
</script>

{#snippet ratingLine()}
	{#if active}
		<p class="text-xs text-gray-500 dark:text-gray-400">
			{calc.rating}: {active.rating}{active.profileKFactor != null
				? ` (K=${active.profileKFactor})`
				: ''}
		</p>
	{/if}
{/snippet}

<div class="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
	<h3 class="font-semibold text-gray-900 dark:text-gray-200">{label}</h3>

	{#if selection.lookedUp}
		<p class="text-sm font-medium text-blue-600 dark:text-blue-400">{selection.lookedUp.name}</p>
	{/if}

	<div class="flex flex-wrap gap-1" role="group" aria-label={calc.inputMode}>
		{#each INPUT_MODES as mode (mode)}
			<button
				type="button"
				onclick={() => switchMode(mode)}
				class="rounded px-2.5 py-1 text-xs transition-colors {inputMode === mode
					? tabClasses.selected
					: tabClasses.idle}"
			>
				{modeLabels[mode]}
			</button>
		{/each}
	</div>

	{#if inputMode === 'manual'}
		<TextField
			label={calc.rating}
			value={selection.manualRating}
			onChange={(value) => onChange({ manualRating: value, lookedUp: null })}
			type="number"
			placeholder={calc.enterRating}
			compact
			fullWidth
		/>
	{:else if inputMode === 'ssfSearch'}
		<div class="space-y-2">
			<PlayerSearchInput
				onSelect={(player) => setLookedUp(fromSsfPlayer(player))}
				placeholder={t.pages.players.search.namePlaceholder}
				noResultsMessage={t.pages.players.search.nameSearchHint}
				helperText={t.pages.players.search.nameSearchHelper}
				searchLabel={calc.search}
				compact
			/>
			{@render ratingLine()}
		</div>
	{:else if inputMode === 'ssfId'}
		<div class="space-y-2">
			<TextField
				label={calc.ssfId}
				value={memberIdInput}
				onChange={(value) => (memberIdInput = value)}
				placeholder={calc.enterSsfId}
				type="number"
				compact
				fullWidth
				onEnter={lookupSsfId}
			/>
			<Button
				onclick={lookupSsfId}
				disabled={searching || !memberIdInput.trim()}
				variant="outlined"
				compact
			>
				{searching ? calc.lookingUp : calc.search}
			</Button>
			{@render ratingLine()}
		</div>
	{:else if inputMode === 'fideId'}
		<div class="space-y-2">
			<TextField
				label={calc.fideId}
				value={fideIdInput}
				onChange={(value) => (fideIdInput = value)}
				placeholder={calc.enterFideId}
				type="number"
				compact
				fullWidth
				onEnter={lookupFideId}
			/>
			<Button
				onclick={lookupFideId}
				disabled={searching || !fideIdInput.trim()}
				variant="outlined"
				compact
			>
				{searching ? calc.lookingUp : calc.search}
			</Button>
			{@render ratingLine()}
		</div>
	{:else if inputMode === 'fideSearch'}
		<div class="space-y-2">
			<FidePlayerSearchInput
				onSelect={(player) => enrich(fromFideSearchHit(player), parseInt(player.fideid, 10))}
				placeholder={t.pages.players.search.namePlaceholder}
				noResultsMessage={t.pages.players.search.nameSearchHint}
				searchLabel={calc.search}
				compact
			/>
			{@render ratingLine()}
		</div>
	{:else if inputMode === 'topPlayer'}
		<div class="space-y-2">
			{#if topPlayersLoading}
				<p class="text-sm text-gray-500 dark:text-gray-400">{calc.loadingTopPlayers}</p>
			{:else}
				<select
					bind:value={topPlayerId}
					onchange={chooseTopPlayer}
					aria-label={calc.topPlayers}
					class="w-full rounded border border-gray-300 bg-transparent px-3 py-1.5 text-sm text-gray-900 hover:border-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-gray-200 dark:hover:border-white"
				>
					<option value="">{calc.selectTopPlayer}</option>
					{#each topPlayers as player (player.fide_id)}
						<option value={player.fide_id}>
							{formatFideActivePlayerName(player)} — {player.rating}
						</option>
					{/each}
				</select>
			{/if}
			{#if searching}
				<p class="text-xs text-gray-500 dark:text-gray-400">{calc.lookingUp}</p>
			{:else}
				{@render ratingLine()}
			{/if}
		</div>
	{/if}

	{#if active?.usingDefault}
		<p class="text-xs text-amber-600 dark:text-amber-400">{calc.noOfficialRating}</p>
	{/if}

	{#if lookupError}
		<p class="text-xs text-red-500 dark:text-red-400">{lookupError}</p>
	{/if}
</div>
