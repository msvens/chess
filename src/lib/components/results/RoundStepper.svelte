<script lang="ts">
	/**
	 * Round scrubber: ◀ "Round N / total" ▶ plus a slider.
	 * Ports `components/results/RoundStepper.tsx`.
	 *
	 * A slider as well as arrows because a long Allsvenskan season is eleven rounds
	 * and clicking through them one at a time is tedious.
	 */
	import { ChevronLeft, ChevronRight, Icon } from 'svelte-hero-icons';

	interface RoundStepperProps {
		/** Available round numbers, ascending. */
		rounds: number[];
		value: number;
		onChange: (round: number) => void;
		/** Word before the number, e.g. "Round" / "Rond". */
		labelPrefix: string;
		prevLabel: string;
		nextLabel: string;
		class?: string;
	}

	let {
		rounds,
		value,
		onChange,
		labelPrefix,
		prevLabel,
		nextLabel,
		class: cls = ''
	}: RoundStepperProps = $props();

	// A value that is not in the list means the round vanished under us — a live
	// refresh can do that. Fall back to the last round rather than showing nothing.
	let index = $derived(rounds.indexOf(value) === -1 ? rounds.length - 1 : rounds.indexOf(value));
	let canPrev = $derived(index > 0);
	let canNext = $derived(index < rounds.length - 1);

	const step = 'rounded-lg p-1.5 transition-colors';
	const enabled = 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800';
	const disabled = 'cursor-not-allowed text-gray-300 dark:text-gray-600';

	function move(delta: number) {
		const next = rounds[index + delta];
		if (next !== undefined) onChange(next);
	}
</script>

{#if rounds.length > 0}
	<div class="flex items-center gap-3 {cls}">
		<button
			type="button"
			onclick={() => canPrev && move(-1)}
			disabled={!canPrev}
			class="{step} {canPrev ? enabled : disabled}"
			aria-label={prevLabel}
		>
			<Icon src={ChevronLeft} class="h-5 w-5" aria-hidden="true" />
		</button>

		<span
			class="text-sm font-medium whitespace-nowrap text-gray-900 tabular-nums dark:text-gray-200"
		>
			{labelPrefix}
			{rounds[index]} / {rounds[rounds.length - 1]}
		</span>

		<input
			type="range"
			min={0}
			max={rounds.length - 1}
			step={1}
			value={index}
			oninput={(e) => onChange(rounds[Number(e.currentTarget.value)])}
			class="max-w-[16rem] min-w-[6rem] flex-1 cursor-pointer accent-blue-600"
			aria-label={labelPrefix}
		/>

		<button
			type="button"
			onclick={() => canNext && move(1)}
			disabled={!canNext}
			class="{step} {canNext ? enabled : disabled}"
			aria-label={nextLabel}
		>
			<Icon src={ChevronRight} class="h-5 w-5" aria-hidden="true" />
		</button>
	</div>
{/if}
