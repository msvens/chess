<script lang="ts">
	/**
	 * A player's rating history: four series over months, as inline SVG.
	 * Ports `components/player/EloRatingChart.tsx`, which used recharts.
	 *
	 * Hand-rolled rather than pulling in a charting library. The data is a
	 * handful of monthly readings and the chart needs no zoom, brush or
	 * animation — while LayerChart's Svelte 5 build is a prerelease and its core
	 * is around 105 KB gzipped, which would make it the largest runtime
	 * dependency in a repo whose entire list is four packages.
	 *
	 * The pieces that are not obvious by eye are ported exactly and pinned
	 * against their originals: `niceTicks` reproduces recharts' own tick
	 * algorithm, and `monotonePath` reproduces d3-shape's `curveMonotoneX`,
	 * which is what `type="monotone"` drew. Colours, stroke widths, dot radii,
	 * the dashed grid and the 1200 floor are all taken from the original.
	 *
	 * Those three modules sit beside this file rather than in a shared home:
	 * this is their only consumer. If a second kind of chart ever arrives, the
	 * genuinely common parts get broken out into a general-purpose chart with
	 * implementations on top — decided against two real callers rather than one
	 * guess. Note how little would actually transfer to, say, a pie chart: it
	 * has no axes, so `ticks` is useless to it, and it draws arcs rather than
	 * splines, so `curve` is too.
	 */
	import { untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import DatePicker from '$lib/components/ui/DatePicker.svelte';
	import { decimateRatingData, getPlayerRatingHistory, type RatingDataPoint } from '$lib/api';
	import { monotonePath, type Point } from './curve';
	import { labelIndices, linearScale, nearestIndex, pointScale, tooltipX, tooltipY } from './scale';
	import { niceTicks } from './ticks';

	interface EloRatingChartProps {
		memberId: number;
		height?: number;
		/** Series names, in the caller's language. */
		labels: { standard: string; rapid: string; blitz: string; lask: string };
		loadingLabel: string;
		errorLabel: string;
		emptyLabel: string;
		/** Accessible name for the chart as a whole. */
		ariaLabel: string;
		showDatePickers?: boolean;
		/** Locale for the date pickers' month names. */
		language?: string;
		/** `YYYY-MM` bounds. Defaults to the last twelve months. */
		initialPeriod?: { start: string; end: string };
		/** 0 responsive, -1 unlimited, or a fixed budget. */
		maxDataPoints?: number;
	}

	let {
		memberId,
		height = 400,
		labels,
		loadingLabel,
		errorLabel,
		emptyLabel,
		ariaLabel,
		showDatePickers = true,
		language,
		initialPeriod,
		maxDataPoints = 0
	}: EloRatingChartProps = $props();

	/**
	 * The four series, in the order recharts stacked them, with the colours it
	 * used. Each label is named explicitly rather than looked up by key — the
	 * dynamic form hides the props from the unused-prop check.
	 *
	 * This order is the *drawing* order, and the tooltip's: recharts' `Tooltip`
	 * would sort too, but the original passes custom content, which bypasses that.
	 * Only the legend is sorted — see `legend` below.
	 */
	let series = $derived([
		{ key: 'lask' as const, colour: '#d97706', label: labels.lask },
		{ key: 'standard' as const, colour: '#0284c7', label: labels.standard },
		{ key: 'rapid' as const, colour: '#be123c', label: labels.rapid },
		{ key: 'blitz' as const, colour: '#059669', label: labels.blitz }
	]);

	/**
	 * The legend, alphabetically by label.
	 *
	 * Not the drawing order: recharts' `Legend` defaults to `itemSorter: 'value'`,
	 * which sorts entries by their displayed name. So the live chart reads Blixt,
	 * Elo, LASK, Snabb rather than the order the lines are declared in — and
	 * lands the same way in English (Blitz, Elo, LASK, Rapid).
	 *
	 * Compared by code point rather than `localeCompare`, which is what lodash's
	 * `sortBy` does inside recharts. The two agree on these four labels; matching
	 * the original exactly costs nothing.
	 */
	let legend = $derived(
		[...series].sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0))
	);

	/** Ratings below this are clipped rather than shown, as in the original. */
	const Y_FLOOR = 1200;

	/**
	 * Slack around the plot so a dot sitting on an edge is drawn whole.
	 *
	 * The clip exists to hide readings below the axis floor, which is a vertical
	 * concern — without this the first and last dots, which sit exactly on the
	 * left and right edges, were sliced in half by it. recharts lets its dots
	 * spill a little past the axis for the same reason. Wider than the active
	 * dot's radius of 4.
	 */
	const DOT_ROOM = 6;

	const monthOf = (date: Date) =>
		`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

	function defaultPeriod() {
		const now = new Date();
		return {
			start: monthOf(new Date(now.getFullYear(), now.getMonth() - 11, 1)),
			end: monthOf(now)
		};
	}

	// Seeds the pickers once. A later change to `initialPeriod` is deliberately
	// ignored — the range belongs to the visitor after the first render — and
	// `untrack` says so rather than leaving it an accidental stale read.
	const period = untrack(() => initialPeriod ?? defaultPeriod());
	let startMonth = $state(period.start);
	let endMonth = $state(period.end);

	let raw = $state<RatingDataPoint[]>([]);
	let loading = $state(true);
	let failed = $state(false);

	/**
	 * How many readings to draw.
	 *
	 * The React version fed this to the fetch, so rotating a phone refetched the
	 * whole history. `getPlayerRatingHistory` makes one request either way and
	 * decimates afterwards, so this is a derivation instead — same points on
	 * screen, no second request. That is also the whole of the old
	 * `useResponsiveDataPoints` hook, which had a window resize listener.
	 */
	const narrow = new MediaQuery('(max-width: 767px)');
	let pointBudget = $derived(
		maxDataPoints === 0 ? (narrow.current ? 12 : 24) : maxDataPoints === -1 ? 0 : maxDataPoints
	);
	let data = $derived(
		pointBudget > 0 && raw.length > pointBudget ? decimateRatingData(raw, pointBudget) : raw
	);

	// --- Geometry, matching recharts' layout for this configuration ---
	// margin {top 5, right 10, left 0, bottom 5}, YAxis width 40, XAxis height 30.
	const PLOT = { top: 5, right: 10, left: 40, bottom: 35 };

	let width = $state(0);
	/** jsdom reports 0, so the fallback is what keeps the component testable. */
	let plotWidth = $derived(width || 640);
	let plotRight = $derived(plotWidth - PLOT.right);
	let plotBottom = $derived(height - PLOT.bottom);

	let values = $derived(
		data.flatMap((point) =>
			series.map(({ key }) => point[key]).filter((v): v is number => typeof v === 'number')
		)
	);
	let ticks = $derived(
		values.length === 0 ? [] : niceTicks(Y_FLOOR, Math.max(Y_FLOOR, ...values), 5)
	);
	let yScale = $derived(
		linearScale(
			[ticks[0] ?? Y_FLOOR, ticks[ticks.length - 1] ?? Y_FLOOR + 100],
			[plotBottom, PLOT.top]
		)
	);
	let xScale = $derived(pointScale(data.length, [PLOT.left, plotRight]));

	let lines = $derived(
		series.map(({ key, colour, label }) => {
			// Missing months are dropped rather than breaking the line — recharts'
			// `connectNulls`.
			const present = data
				.map((point, index) => [index, point[key]] as const)
				.filter((pair): pair is readonly [number, number] => typeof pair[1] === 'number');
			const points: Point[] = present.map(([index, value]) => [xScale(index), yScale(value)]);
			// The dot keeps its own reading's index, so the hovered one can grow
			// without the filtered position being mistaken for the data position.
			const dots = present.map(([index], i) => ({ index, x: points[i][0], y: points[i][1] }));
			return { key, colour, label, points, dots, path: monotonePath(points) };
		})
	);

	let labelled = $derived(labelIndices(data.length, plotRight - PLOT.left));
	/** One vertical gridline per reading. */
	let gridX = $derived([...data.keys()].map((index) => xScale(index)));

	// --- Hover ---

	let hoverIndex = $state(-1);
	let hovered = $derived(hoverIndex >= 0 && hoverIndex < data.length ? data[hoverIndex] : null);

	function trackPointer(event: PointerEvent) {
		const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
		hoverIndex = nearestIndex(event.clientX - box.left, data.length, [PLOT.left, plotRight]);
	}

	// Measured, so the placement below is decided on the real size.
	let measuredTipWidth = $state(0);
	let measuredTipHeight = $state(0);
	let tipWidth = $derived(measuredTipWidth || 150);
	let tipHeight = $derived(measuredTipHeight || 90);

	/** Where each series has a dot at the hovered reading. */
	let hoveredDotYs = $derived(
		hoverIndex < 0
			? []
			: lines.flatMap((line) =>
					line.dots.filter((dot) => dot.index === hoverIndex).map((dot) => dot.y)
				)
	);

	/**
	 * Where to put the tooltip: beside the hovered dot, flipping to its left when
	 * there is no room on the right.
	 *
	 * Flipping rather than clamping. Clamping against a guessed width pinned the
	 * tooltip in place for every reading past the threshold — on a phone that was
	 * the whole right-hand half of the chart, so moving between those dots looked
	 * like nothing had happened.
	 */
	let tooltipLeft = $derived(
		hoverIndex < 0 ? 0 : tooltipX(xScale(hoverIndex), tipWidth, [PLOT.left, plotRight], plotWidth)
	);
	let tooltipTop = $derived(hoverIndex < 0 ? 0 : tooltipY(hoveredDotYs, tipHeight, height));

	// --- Fetching ---

	// Guards against a slower earlier range landing after a newer one; clicking
	// through the date pickers quickly is the ordinary way to cause that.
	let token = 0;

	$effect(() => {
		const id = memberId;
		const from = startMonth;
		const to = endMonth;
		if (!Number.isFinite(id)) return;

		const mine = ++token;
		loading = true;
		failed = false;

		// `getPlayerRatingHistory` never throws — it answers with a status.
		getPlayerRatingHistory(id, from, to).then((response) => {
			if (mine !== token) return;
			if (response.status === 200 && response.data) {
				raw = response.data;
			} else {
				// Clear rather than leave the previous player's chart on screen with
				// no indication anything went wrong, as the React version did.
				raw = [];
				failed = true;
			}
			loading = false;
		});
	});
</script>

{#if showDatePickers}
	<div class="mb-4 flex gap-3">
		<DatePicker
			value={startMonth}
			onChange={(value) => (startMonth = value)}
			mode="month"
			compact
			{language}
		/>
		<DatePicker
			value={endMonth}
			onChange={(value) => (endMonth = value)}
			mode="month"
			compact
			{language}
		/>
	</div>
{/if}

{#if loading}
	<div
		class="flex items-center justify-center text-gray-600 dark:text-gray-400"
		style="height: {height}px"
	>
		{loadingLabel}
	</div>
{:else if failed}
	<div class="py-3 text-sm text-red-500 dark:text-red-400">{errorLabel}</div>
{:else if data.length === 0}
	<div class="py-3 text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</div>
{:else}
	<div
		class="relative"
		style="height: {height}px"
		role="img"
		aria-label={ariaLabel}
		bind:clientWidth={width}
		onpointermove={trackPointer}
		onpointerleave={() => (hoverIndex = -1)}
	>
		<svg width="100%" {height} aria-hidden="true">
			<!-- Grid: horizontals on the ticks, verticals on the readings. -->
			<g class="stroke-gray-200 dark:stroke-gray-700" stroke-dasharray="3 3" opacity="0.5">
				{#each ticks as tick (tick)}
					<line x1={PLOT.left} x2={plotRight} y1={yScale(tick)} y2={yScale(tick)} />
				{/each}
				{#each gridX as x, index (index)}
					<line x1={x} x2={x} y1={PLOT.top} y2={plotBottom} />
				{/each}
			</g>

			<!-- Axis lines, at recharts' hairline width. -->
			<g class="stroke-gray-600 dark:stroke-gray-400" stroke-width="0.5">
				<line x1={PLOT.left} x2={PLOT.left} y1={PLOT.top} y2={plotBottom} />
				<line x1={PLOT.left} x2={plotRight} y1={plotBottom} y2={plotBottom} />
			</g>

			<g class="fill-gray-600 dark:fill-gray-400" font-size="11">
				{#each ticks as tick (tick)}
					<text x={PLOT.left - 4} y={yScale(tick)} text-anchor="end" dominant-baseline="middle">
						{tick}
					</text>
				{/each}
				{#each labelled as index (index)}
					<text x={xScale(index)} y={plotBottom + 16} text-anchor="middle">
						{data[index].date}
					</text>
				{/each}
			</g>

			<!-- Anything below the axis floor is clipped, as recharts does for an
			     explicit domain minimum. Left, right and top get a dot's worth of
			     slack so an edge dot is not cut in half; the bottom stays tight,
			     because that edge is the floor doing its job. -->
			<clipPath id="elo-plot-{memberId}">
				<rect
					x={PLOT.left - DOT_ROOM}
					y={PLOT.top - DOT_ROOM}
					width={Math.max(0, plotRight - PLOT.left + DOT_ROOM * 2)}
					height={Math.max(0, plotBottom - PLOT.top + DOT_ROOM)}
				/>
			</clipPath>

			<g clip-path="url(#elo-plot-{memberId})">
				{#each lines as line (line.key)}
					{#if line.points.length > 0}
						<path d={line.path} fill="none" stroke={line.colour} stroke-width="1" />
						{#each line.dots as dot (dot.index)}
							<circle
								cx={dot.x}
								cy={dot.y}
								r={dot.index === hoverIndex ? 4 : 2.5}
								fill={line.colour}
							/>
						{/each}
					{/if}
				{/each}
			</g>
		</svg>

		{#if hovered}
			<div
				class="pointer-events-none absolute rounded border border-gray-200 bg-white px-2 py-1.5 shadow-lg dark:border-gray-700 dark:bg-gray-800"
				style="left: {tooltipLeft}px; top: {tooltipTop}px"
				bind:clientWidth={measuredTipWidth}
				bind:clientHeight={measuredTipHeight}
			>
				<p class="mb-0.5 text-xs font-medium text-gray-900 dark:text-gray-200">{hovered.date}</p>
				{#each series as { key, colour, label } (key)}
					{#if typeof hovered[key] === 'number'}
						<p class="text-xs" style="color: {colour}">{label}: {hovered[key]}</p>
					{/if}
				{/each}
			</div>
		{/if}
	</div>

	<div class="flex flex-wrap justify-center gap-4 pt-[15px] text-xs">
		{#each legend as { key, colour, label } (key)}
			<span class="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
				<svg width="8" height="8" aria-hidden="true">
					<circle cx="4" cy="4" r="4" fill={colour} />
				</svg>
				{label}
			</span>
		{/each}
	</div>
{/if}
