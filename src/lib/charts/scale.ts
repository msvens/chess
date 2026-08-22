/**
 * Turning data into pixels for an SVG chart.
 *
 * Mirrors the geometry recharts produced for the rating chart: a linear Y scale
 * over the tick extent, and a *point* X scale that puts the first reading hard
 * against the left edge of the plot and the last against the right, with the
 * rest spread evenly between.
 */
export type Scale = (value: number) => number;

/**
 * A linear map from `domain` onto `range`.
 *
 * The range is usually inverted for a Y axis — pixels grow downward while
 * ratings grow upward — so `[bottom, top]` is the ordinary call, not a mistake.
 * A zero-width domain pins everything to the middle of the range rather than
 * dividing by zero.
 */
export function linearScale(domain: [number, number], range: [number, number]): Scale {
	const [d0, d1] = domain;
	const [r0, r1] = range;
	const span = d1 - d0;
	if (span === 0) return () => (r0 + r1) / 2;
	return (value) => r0 + ((value - d0) / span) * (r1 - r0);
}

/**
 * Evenly spaced positions for `count` readings across `range`.
 *
 * A single reading is centred; otherwise the ends sit on the edges of the plot,
 * which is what a point scale does and what recharts used here.
 */
export function pointScale(count: number, range: [number, number]): Scale {
	const [r0, r1] = range;
	if (count <= 1) return () => (r0 + r1) / 2;
	return (index) => r0 + (index / (count - 1)) * (r1 - r0);
}

/**
 * Show every nth X label, so they do not collide.
 *
 * recharts calls this `interval="preserveEnd"` and measures the rendered text to
 * decide; measuring is not available before layout here, so this divides the
 * width by a nominal label width instead. Same intent, and the last label is
 * kept either way — see `labelIndices`.
 */
export function labelInterval(count: number, width: number, minLabelPx = 46): number {
	if (count <= 1 || width <= 0) return 1;
	const fits = Math.max(1, Math.floor(width / minLabelPx));
	return Math.max(1, Math.ceil(count / fits));
}

/**
 * Which labels to draw, thinned to fit, always including the last.
 *
 * The last matters more than the first: it is the most recent rating, and an
 * axis whose right-hand end is unlabelled looks truncated.
 */
export function labelIndices(count: number, width: number, minLabelPx = 46): number[] {
	if (count <= 0) return [];
	const step = labelInterval(count, width, minLabelPx);
	const last = count - 1;

	const indices: number[] = [];
	for (let i = last; i >= 0; i -= step) indices.push(i);
	return indices.reverse();
}

/**
 * The reading nearest a pixel position, for the hover tooltip.
 *
 * Clamped, so a pointer just outside the plot still picks the nearest end
 * rather than reporting nothing.
 */
export function nearestIndex(px: number, count: number, range: [number, number]): number {
	if (count <= 0) return -1;
	if (count === 1) return 0;

	const [r0, r1] = range;
	const span = r1 - r0;
	if (span === 0) return 0;

	const ratio = (px - r0) / span;
	return Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))));
}

/**
 * Where to put a hover tooltip beside a point.
 *
 * The offset eases from one side of the point to the other across the plot:
 * just right of the first reading, just left of the last, sliding continuously
 * in between. So the tooltip always moves when the hovered reading changes, and
 * it never jumps sides.
 *
 * Two simpler rules were tried and rejected. Clamping to the right edge pins
 * every reading past the threshold at one position — six of twelve on a phone —
 * so moving between them looks like nothing has happened. Flipping at the
 * threshold fixes that but the jump reads badly.
 */
export function tooltipX(
	pointX: number,
	tipWidth: number,
	plot: readonly [start: number, end: number],
	containerWidth: number,
	gap = 12
): number {
	const [start, end] = plot;
	const span = end - start;
	const progress = span === 0 ? 0 : Math.min(1, Math.max(0, (pointX - start) / span));
	const left = pointX + gap - progress * (tipWidth + 2 * gap);
	return Math.max(0, Math.min(left, containerWidth - tipWidth));
}

/**
 * How far down to put a hover tooltip so it does not cover the readings.
 *
 * Below the lowest dot at the hovered position, or above the highest one when
 * there is no room below. Anchored to the dots rather than to the top of the
 * plot: a fixed anchor sits on top of any reading that happens to be up there,
 * which is exactly the one being pointed at.
 *
 * Unlike the horizontal placement, flipping here is fine — it depends on where
 * the ratings are, not on where the pointer is, so it does not flicker as the
 * pointer sweeps across.
 */
export function tooltipY(
	dotYs: readonly number[],
	tipHeight: number,
	containerHeight: number,
	gap = 10
): number {
	if (dotYs.length === 0) return 0;

	const below = Math.max(...dotYs) + gap;
	const above = Math.min(...dotYs) - gap - tipHeight;
	const chosen = below + tipHeight <= containerHeight ? below : above;

	return Math.max(0, Math.min(chosen, containerHeight - tipHeight));
}
