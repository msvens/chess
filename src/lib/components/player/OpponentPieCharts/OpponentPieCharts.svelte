<script lang="ts">
	/**
	 * Three pies: a player's record overall, as white, and as black.
	 * Ports `components/player/OpponentPieCharts.tsx`, which was recharts.
	 *
	 * The React version watched `documentElement`'s class list with a
	 * `MutationObserver` to learn the theme; the theme store already knows, so
	 * that goes entirely.
	 *
	 * Every card is 200px tall at both breakpoints. The original asked for
	 * `className="md:h-[320px]"` on the responsive container, but recharts writes
	 * an inline height, so the class never applied — 200 is what live shows.
	 */
	import PieCard from './PieCard.svelte';
	import type { Slice } from './pie';
	import type { ColorStats } from '$lib/api';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface OpponentPieChartsProps {
		all: ColorStats;
		white: ColorStats;
		black: ColorStats;
	}

	let { all, white, black }: OpponentPieChartsProps = $props();

	let t = $derived(getTranslation(language.current).pages.playerDetail.opponentsTab);

	/** Bound to position, as the original bound them to the array index. */
	const COLOURS = ['#22c55e', '#6b7280', '#ef4444'] as const;

	const slicesOf = (
		stats: ColorStats,
		labels: { wins: string; draws: string; losses: string }
	): Slice[] => [
		{ label: labels.wins, value: stats.wins, colour: COLOURS[0] },
		{ label: labels.draws, value: stats.draws, colour: COLOURS[1] },
		{ label: labels.losses, value: stats.losses, colour: COLOURS[2] }
	];

	let cards = $derived([
		{ title: t.charts.all, slices: slicesOf(all, t.stats) },
		{ title: t.charts.white, slices: slicesOf(white, t.stats) },
		{ title: t.charts.black, slices: slicesOf(black, t.stats) }
	]);

	/** No games at all means no block — not three empty cards. */
	let hasGames = $derived(all.wins + all.draws + all.losses > 0);
</script>

{#if hasGames}
	<div class="mb-8 grid grid-cols-3 gap-2 md:gap-6">
		{#each cards as { title, slices } (title)}
			<PieCard {title} {slices} noGamesLabel={t.charts.noGames} />
		{/each}
	</div>
{/if}
