<script lang="ts">
	/**
	 * One pie, with its heading, its percentages and its legend.
	 * Ports the `PieChartCard` inner component of `OpponentPieCharts.tsx`.
	 *
	 * Its own component rather than a snippet because each card measures itself
	 * and tracks its own hover — state a snippet cannot hold.
	 */
	import {
		LABEL_FLOOR,
		arcs,
		legendOrder,
		pieRadius,
		sliceAt,
		slicePercent,
		tooltipText,
		type Slice
	} from './pie';
	import { theme } from '$lib/stores/theme.svelte';

	interface PieCardProps {
		title: string;
		slices: Slice[];
		/** Shown in place of the chart when this colour was never played. */
		noGamesLabel: string;
	}

	let { title, slices, noGamesLabel }: PieCardProps = $props();

	/** The chart box; with the legend row beneath it this makes 200, as recharts did. */
	const CHART_HEIGHT = 176;

	let width = $state(0);
	let pointer = $state<{ x: number; y: number } | null>(null);

	let dark = $derived(theme.current === 'dark');
	let total = $derived(slices.reduce((sum, slice) => sum + slice.value, 0));
	let radius = $derived(pieRadius(width, CHART_HEIGHT));
	let laid = $derived(arcs(slices, width / 2, CHART_HEIGHT / 2, radius));
	let hovered = $derived(
		pointer ? sliceAt(laid, width / 2, CHART_HEIGHT / 2, radius, pointer.x, pointer.y) : null
	);
	let legend = $derived(legendOrder(slices));

	/**
	 * The chart's text alternative. The original offered none — the pie was
	 * unreadable without a mouse, and the numbers appear nowhere else on the tab.
	 */
	let summary = $derived(
		`${title}: ${slices.map((slice) => `${slice.label} ${slice.value}`).join(', ')}`
	);
</script>

<div class="flex flex-col items-center">
	{#if total === 0}
		<!-- The original's empty card keeps a non-responsive heading and a taller
		     box than the populated one. Carried over rather than tidied. -->
		<h3 class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-200">{title}</h3>
		<div class="flex h-64 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
			{noGamesLabel}
		</div>
	{:else}
		<h3 class="mb-1 text-xs font-medium text-gray-900 md:mb-2 md:text-sm dark:text-gray-200">
			{title}
		</h3>

		<div class="w-full">
			<!-- The role and the label live here rather than on the `<svg>`: the
			     drawing waits until the card has been measured, and an accessible
			     name that appears a frame later is no accessible name at all. It is
			     also what lets the pointer be tracked in one place. -->
			<div
				class="relative w-full"
				style="height: {CHART_HEIGHT}px"
				role="img"
				aria-label={summary}
				bind:clientWidth={width}
				onmousemove={(event) => (pointer = { x: event.offsetX, y: event.offsetY })}
				onmouseleave={() => (pointer = null)}
			>
				<!-- Nothing until the card has been measured: `pieRadius` follows
				     recharts in taking `Math.abs`, so an unmeasured card would draw a
				     4.5px pie rather than none. -->
				{#if width > 0}
					<svg {width} height={CHART_HEIGHT} aria-hidden="true">
						{#each laid as arc (arc.label)}
							{#if arc.kind === 'whole'}
								<circle
									cx={width / 2}
									cy={CHART_HEIGHT / 2}
									r={radius}
									fill={arc.colour}
									stroke="#fff"
									stroke-width="1"
								/>
							{:else if arc.kind === 'wedge'}
								<path d={arc.path} fill={arc.colour} stroke="#fff" stroke-width="1" />
							{/if}
						{/each}

						{#each laid as arc (arc.label)}
							{#if arc.percent >= LABEL_FLOOR}
								<text
									x={arc.labelX}
									y={arc.labelY}
									text-anchor="middle"
									dominant-baseline="middle"
									class="text-sm font-semibold"
									fill={dark ? 'white' : '#1f2937'}
									style="text-shadow: 0 0 3px {dark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}"
								>
									{slicePercent(arc.percent)}
								</text>
							{/if}
						{/each}
					</svg>

					{#if hovered && pointer}
						<div
							class="pointer-events-none absolute rounded border border-gray-200 bg-white px-2 py-1.5 shadow-lg dark:border-gray-700 dark:bg-gray-800"
							style="left: {pointer.x + 10}px; top: {pointer.y}px"
						>
							<p class="text-xs font-medium text-gray-900 dark:text-gray-200">
								{tooltipText(hovered)}
							</p>
						</div>
					{/if}
				{/if}
			</div>

			<!-- A zero entry keeps its row: it is how a player learns they have
			     never drawn as black. -->
			<div class="flex flex-wrap justify-center gap-3 pt-[10px] text-[11px]">
				{#each legend as entry (entry.label)}
					<span class="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
						<svg width="8" height="8" aria-hidden="true">
							<circle cx="4" cy="4" r="4" fill={entry.colour} />
						</svg>
						{entry.label}
					</span>
				{/each}
			</div>
		</div>
	{/if}
</div>
