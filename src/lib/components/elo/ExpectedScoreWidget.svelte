<script lang="ts">
	/**
	 * Two ratings in, two expected scores out — the formula on the page, live.
	 * Ports `ExpectedScoreWidget` from `app/elo/calculation/page.tsx`.
	 */
	import TextField from '$lib/components/ui/TextField.svelte';
	import { RATING_DIFFERENCE_CAP, calculateExpectedScore } from '$lib/api';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let playerRating = $state('1500');
	let opponentRating = $state('1500');

	let t = $derived(getTranslation(language.current).pages.elo.expectedScoreWidget);

	let player = $derived(parseInt(playerRating, 10) || 0);
	let opponent = $derived(parseInt(opponentRating, 10) || 0);
	let valid = $derived(player > 0 && opponent > 0);
	let difference = $derived(Math.abs(player - opponent));

	const percent = (score: number) => `${(score * 100).toFixed(1)}%`;
</script>

<div class="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
	<h3 class="font-semibold text-gray-900 dark:text-gray-200">{t.title}</h3>
	<div class="flex flex-col gap-4 sm:flex-row">
		<TextField
			id="expected-player"
			label={t.yourRating}
			value={playerRating}
			onChange={(value) => (playerRating = value)}
			type="number"
			compact
		/>
		<TextField
			id="expected-opponent"
			label={t.opponentRating}
			value={opponentRating}
			onChange={(value) => (opponentRating = value)}
			type="number"
			compact
		/>
	</div>
	{#if valid}
		<div class="space-y-1 text-sm text-gray-700 dark:text-gray-300">
			<p>
				<span class="font-medium">{t.yourExpected}</span>
				{percent(calculateExpectedScore(player, opponent))}
			</p>
			<p>
				<span class="font-medium">{t.opponentExpected}</span>
				{percent(calculateExpectedScore(opponent, player))}
			</p>
			<p class="text-xs text-gray-500 dark:text-gray-400">
				{t.ratingDifference}: {difference}
				{t.points}{difference > RATING_DIFFERENCE_CAP ? ` ${t.capped}` : ''}
			</p>
		</div>
	{/if}
</div>
