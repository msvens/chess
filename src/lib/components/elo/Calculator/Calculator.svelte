<script lang="ts">
	/**
	 * What one game does to two ratings. Ports the page half of
	 * `app/elo/calculator/page.tsx`.
	 *
	 * Everything below the inputs is `$derived` from the two selections and the
	 * settings. The Next app stored each player's active rating as a string and
	 * re-derived it in a render-time "previous Elo type" comparison; deriving it
	 * makes that hack, and the state it guarded, unnecessary.
	 */
	import { onMount } from 'svelte';
	import TextField from '$lib/components/ui/TextField.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import PlayerInput from './PlayerInput.svelte';
	import {
		RATING_DIFFERENCE_CAP,
		calculatePerformanceRating,
		fideService,
		type FideActivePlayer
	} from '$lib/api';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import {
		ELO_TYPES,
		EMPTY_SELECTION,
		GAME_RESULTS,
		expectedScore,
		ratingChange,
		resolveKFactor,
		scoreOf,
		selectedRating,
		type EloType,
		type GameResult,
		type PlayerSelection
	} from './calculator';

	const TOP_PLAYER_COUNT = 10;

	let player1 = $state<PlayerSelection>({ ...EMPTY_SELECTION });
	let player2 = $state<PlayerSelection>({ ...EMPTY_SELECTION });
	let eloType = $state<EloType>('standard');
	let result = $state<GameResult>('win');
	let kFactorMode = $state<'auto' | 'manual'>('auto');
	let manualK1 = $state('20');
	let manualK2 = $state('20');
	let removeCap = $state(false);
	let topPlayers = $state<FideActivePlayer[]>([]);
	let topPlayersLoading = $state(false);

	let t = $derived(getTranslation(language.current));
	let calc = $derived(t.pages.elo.calculator);

	// Fetched once for both inputs. A failure just leaves the dropdown empty.
	onMount(async () => {
		topPlayersLoading = true;
		const response = await fideService.getTopActive(TOP_PLAYER_COUNT);
		if (response.status === 200 && response.data) topPlayers = response.data;
		topPlayersLoading = false;
	});

	let eloTypeLabels = $derived<Record<EloType, string>>({
		standard: calc.standard,
		rapid: calc.rapid,
		blitz: calc.blitz
	});

	let resultLabels = $derived<Record<GameResult, string>>({
		win: calc.player1Wins,
		draw: calc.draw,
		loss: calc.player2Wins
	});

	interface Side {
		name: string;
		rating: number;
		expected: number;
		change: number;
		performance: number;
		k: number;
		kFromProfile: boolean;
	}

	let outcome = $derived.by((): { difference: number; sides: Side[] } | null => {
		const active1 = selectedRating(player1, eloType);
		const active2 = selectedRating(player2, eloType);
		if (!active1 || !active2) return null;

		const capped = !removeCap;
		const score1 = scoreOf(result);
		const score2 = 1 - score1;
		const k1 = resolveKFactor(
			player1,
			active1,
			eloType,
			kFactorMode === 'manual' ? manualK1 : null
		);
		const k2 = resolveKFactor(
			player2,
			active2,
			eloType,
			kFactorMode === 'manual' ? manualK2 : null
		);
		const r1 = active1.rating;
		const r2 = active2.rating;

		return {
			difference: Math.abs(r1 - r2),
			sides: [
				{
					name: player1.lookedUp?.name || calc.player1,
					rating: r1,
					expected: expectedScore(r1, r2, capped),
					change: ratingChange(r1, r2, score1, k1.k, capped),
					performance: calculatePerformanceRating([r2], score1),
					k: k1.k,
					kFromProfile: k1.fromProfile
				},
				{
					name: player2.lookedUp?.name || calc.player2,
					rating: r2,
					expected: expectedScore(r2, r1, capped),
					change: ratingChange(r2, r1, score2, k2.k, capped),
					performance: calculatePerformanceRating([r1], score2),
					k: k2.k,
					kFromProfile: k2.fromProfile
				}
			]
		};
	});

	const pillClasses = {
		selected: 'bg-gray-200 font-medium text-gray-900 dark:bg-gray-700 dark:text-gray-200',
		idle: 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
	} as const;

	const signed = (change: number) => `${change >= 0 ? '+' : ''}${change.toFixed(1)}`;
</script>

{#snippet pill(label: string, selected: boolean, select: () => void)}
	<button
		type="button"
		onclick={select}
		class="rounded px-3 py-1 text-sm transition-colors {selected
			? pillClasses.selected
			: pillClasses.idle}"
	>
		{label}
	</button>
{/snippet}

<div class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
	<PlayerInput
		label={calc.player1}
		selection={player1}
		onChange={(selection) => (player1 = selection)}
		{eloType}
		{topPlayers}
		{topPlayersLoading}
	/>
	<PlayerInput
		label={calc.player2}
		selection={player2}
		onChange={(selection) => (player2 = selection)}
		{eloType}
		{topPlayers}
		{topPlayersLoading}
	/>
</div>

<div class="mb-6 space-y-2">
	<div class="flex items-center gap-2">
		<span class="w-16 flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">{calc.eloType}:</span>
		<div class="flex gap-1" role="group" aria-label={calc.eloType}>
			{#each ELO_TYPES as type (type)}
				{@render pill(eloTypeLabels[type], eloType === type, () => (eloType = type))}
			{/each}
		</div>
	</div>

	<div class="flex items-center gap-2">
		<span class="w-16 flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">{calc.result}:</span>
		<div class="flex gap-1" role="group" aria-label={calc.result}>
			{#each GAME_RESULTS as outcomeOption (outcomeOption)}
				{@render pill(
					resultLabels[outcomeOption],
					result === outcomeOption,
					() => (result = outcomeOption)
				)}
			{/each}
		</div>
	</div>

	<div class="flex items-center gap-2">
		<span class="w-16 flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">{calc.kFactor}:</span>
		<div class="flex items-center gap-1" role="group" aria-label={calc.kFactor}>
			{@render pill(calc.auto, kFactorMode === 'auto', () => (kFactorMode = 'auto'))}
			{@render pill(calc.manual, kFactorMode === 'manual', () => (kFactorMode = 'manual'))}
			{#if kFactorMode === 'manual'}
				<div class="ml-2 flex gap-2">
					<TextField
						id="manual-k1"
						label="K1"
						value={manualK1}
						onChange={(value) => (manualK1 = value)}
						type="number"
						compact
					/>
					<TextField
						id="manual-k2"
						label="K2"
						value={manualK2}
						onChange={(value) => (manualK2 = value)}
						type="number"
						compact
					/>
				</div>
			{/if}
		</div>
	</div>

	{#if kFactorMode === 'auto'}
		<div class="flex items-center gap-2">
			<span class="w-16 flex-shrink-0"></span>
			<p class="text-xs text-gray-500 dark:text-gray-400">{calc.autoHint}</p>
		</div>
	{/if}

	<div class="flex items-center gap-2">
		<span class="w-16 flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">&nbsp;</span>
		<Toggle
			checked={removeCap}
			onChange={(checked) => (removeCap = checked)}
			label={calc.removeCap}
		/>
	</div>
</div>

{#if outcome}
	<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
		{#if removeCap && outcome.difference > RATING_DIFFERENCE_CAP}
			<p class="mb-3 text-xs text-amber-600 dark:text-amber-400">
				{calc.uncappedNote.replace('{difference}', String(outcome.difference))}
			</p>
		{/if}
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
			{#each outcome.sides as side, index (index)}
				<div class="space-y-2">
					<h4 class="font-semibold text-gray-900 dark:text-gray-200">
						{side.name}
						<span class="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
							({side.rating})
						</span>
					</h4>
					<div class="space-y-1 text-sm text-gray-700 dark:text-gray-300">
						<p>
							<span class="text-gray-500 dark:text-gray-400">{calc.expectedScore}:</span>
							{(side.expected * 100).toFixed(1)}%
						</p>
						<p>
							<span class="text-gray-500 dark:text-gray-400">{calc.ratingChange}:</span>
							<span
								class={side.change >= 0
									? 'text-green-600 dark:text-green-400'
									: 'text-red-600 dark:text-red-400'}
							>
								{signed(side.change)}
							</span>
						</p>
						<p>
							<span class="text-gray-500 dark:text-gray-400">{calc.newRating}:</span>
							{Math.round(side.rating + side.change)}
						</p>
						<p>
							<span class="text-gray-500 dark:text-gray-400">{calc.performanceRating}:</span>
							{Math.round(side.performance)}
						</p>
						<p class="text-xs text-gray-400 dark:text-gray-500">
							K = {side.k}{side.kFromProfile ? ` (${calc.fromProfile})` : ''}
						</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
