<script lang="ts">
	/**
	 * The strip of round tabs above a round's results. On a phone it is wider than
	 * the screen, so it keeps the active round centred.
	 */
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface RoundTabsProps {
		rounds: number[];
		activeRound: number | null;
		/** The date shown under a round; empty for none. */
		dateOf: (round: number) => string;
		onSelect: (round: number) => void;
	}

	let { rounds, activeRound, dateOf, onSelect }: RoundTabsProps = $props();

	let roundLabel = $derived(
		getTranslation(language.current).pages.tournamentResults.roundByRound.round
	);

	let strip = $state<HTMLDivElement>();
	let centredRound: number | null = null;

	// Only when the active round changes, so a live refresh leaves someone swiping
	// through the tabs alone. Sets `scrollLeft` rather than calling
	// `scrollIntoView`, which would also scroll the page down to this strip.
	$effect(() => {
		if (activeRound === null || activeRound === centredRound || !strip) return;
		const tab = strip.querySelector('[aria-current="true"]');
		if (!tab) return;

		const stripBox = strip.getBoundingClientRect();
		const tabBox = tab.getBoundingClientRect();
		strip.style.scrollBehavior = centredRound === null ? 'auto' : 'smooth';
		strip.scrollLeft += tabBox.left - stripBox.left - (stripBox.width - tabBox.width) / 2;
		centredRound = activeRound;
	});
</script>

<div bind:this={strip} class="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
	{#each rounds as round (round)}
		{@const active = activeRound === round}
		{@const dateLabel = dateOf(round)}
		<button
			type="button"
			onclick={() => onSelect(round)}
			aria-current={active ? 'true' : undefined}
			class="flex-shrink-0 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors {active
				? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
				: 'text-gray-600 dark:text-gray-400'}"
		>
			<div>{roundLabel} {round}</div>
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
