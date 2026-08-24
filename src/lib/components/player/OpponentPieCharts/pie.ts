/**
 * Pie geometry, as recharts drew it.
 *
 * Replaces `<PieChart>` from recharts in `components/player/OpponentPieCharts.tsx`.
 * The defaults are taken from the library rather than guessed — `startAngle: 0`,
 * `endAngle: 360`, `innerRadius: 0`, `paddingAngle: 0`, `stroke: '#fff'` — so the
 * charts land where they used to.
 *
 * Separate from the component because arc paths and label positions are exactly
 * what a rendered test asserts badly: comparing an SVG `d` string in the DOM says
 * nothing, while checking that a quarter slice ends at twelve o'clock says
 * everything.
 */

/** One wedge, before it knows where it is. */
export interface Slice {
	label: string;
	value: number;
	colour: string;
}

/** A wedge with its geometry worked out. */
export interface Arc {
	label: string;
	colour: string;
	value: number;
	/** Share of the total, 0–1. */
	percent: number;
	/**
	 * How to draw it. A slice worth nothing is drawn not at all, and a slice worth
	 * everything is a circle — a 360° arc starts and ends at the same point, which
	 * SVG renders as nothing at all.
	 */
	kind: 'empty' | 'whole' | 'wedge';
	/** Only for `wedge`. */
	path: string;
	/** Where the percentage sits, at half the radius. */
	labelX: number;
	labelY: number;
	/** Degrees, counter-clockwise from three o'clock. */
	startAngle: number;
	endAngle: number;
}

const RADIAN = Math.PI / 180;

/**
 * Screen position of an angle.
 *
 * recharts negates the angle, so 0° is three o'clock and angles grow
 * *counter-clockwise* — the opposite of the SVG arc sweep direction, which is
 * why every wedge below is drawn with `sweep-flag` 0.
 */
export function pointAt(cx: number, cy: number, radius: number, degrees: number): [number, number] {
	return [cx + radius * Math.cos(-degrees * RADIAN), cy + radius * Math.sin(-degrees * RADIAN)];
}

/**
 * The radius recharts would have used.
 *
 * `getMaxRadius` halves the smaller side of the plot area; `outerRadius="90%"`
 * then takes its share. The plot area is the box less the chart's own margin,
 * which is 5px on every side.
 */
export function pieRadius(width: number, height: number, margin = 5, share = 0.9): number {
	const inner = Math.min(Math.abs(width - margin * 2), Math.abs(height - margin * 2)) / 2;
	return Math.max(0, inner * share);
}

/** Percentages below this are not written on the slice — there is no room. */
export const LABEL_FLOOR = 0.05;

/**
 * The wedges, in the order given.
 *
 * Order matters twice over: colour is bound to *position* in the original, and
 * the wedges are laid out one after another from three o'clock.
 */
export function arcs(slices: readonly Slice[], cx: number, cy: number, radius: number): Arc[] {
	const total = slices.reduce((sum, slice) => sum + slice.value, 0);
	if (total <= 0) return [];

	let angle = 0;

	return slices.map((slice) => {
		const percent = slice.value / total;
		const sweep = percent * 360;
		const start = angle;
		const end = angle + sweep;
		angle = end;

		const mid = (start + end) / 2;
		const [labelX, labelY] = pointAt(cx, cy, radius * 0.5, mid);

		const common = {
			label: slice.label,
			colour: slice.colour,
			value: slice.value,
			percent,
			labelX,
			labelY,
			startAngle: start,
			endAngle: end
		};

		if (slice.value <= 0) return { ...common, kind: 'empty' as const, path: '' };
		if (percent >= 1) return { ...common, kind: 'whole' as const, path: '' };

		const [x0, y0] = pointAt(cx, cy, radius, start);
		const [x1, y1] = pointAt(cx, cy, radius, end);
		const largeArc = sweep > 180 ? 1 : 0;

		return {
			...common,
			kind: 'wedge' as const,
			path: `M ${cx} ${cy} L ${x0} ${y0} A ${radius} ${radius} 0 ${largeArc} 0 ${x1} ${y1} Z`
		};
	});
}

/**
 * The legend's order: alphabetical by label.
 *
 * recharts sorts every legend by the entry's displayed name (`itemSorter:
 * 'value'`), so the row order under each pie is not wins/draws/losses. It also
 * differs by language — English gives Draws, Losses, Wins while Swedish gives
 * Förluster, Remier, Vinster — which is why it is sorted here rather than fixed.
 *
 * Compared by code point, as lodash's `sortBy` does inside recharts.
 */
export function legendOrder(slices: readonly Slice[]): Slice[] {
	return [...slices].sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
}

/** `12%` on the slice; the tooltip carries the decimal instead. */
export const slicePercent = (percent: number): string => `${Math.round(percent * 100)}%`;

/** `Vinster: 34 (14.8%)` — one decimal, where the slice label has none. */
export function tooltipText(arc: Pick<Arc, 'label' | 'value' | 'percent'>): string {
	return `${arc.label}: ${arc.value} (${(arc.percent * 100).toFixed(1)}%)`;
}

/**
 * The wedge under a point, or null outside the pie.
 *
 * Hit-testing by angle rather than hanging a handler on every `<path>`: one
 * listener instead of three, no interactive role on a decorative shape, and the
 * rule is testable without a DOM. Equivalent to what recharts does with its
 * sectors, there being no inner radius to complicate it.
 */
export function sliceAt(
	laid: readonly Arc[],
	cx: number,
	cy: number,
	radius: number,
	x: number,
	y: number
): Arc | null {
	const dx = x - cx;
	const dy = y - cy;
	if (Math.hypot(dx, dy) > radius) return null;

	// Back to recharts' convention: negate, then fold into 0–360.
	let degrees = (-Math.atan2(dy, dx) * 180) / Math.PI;
	if (degrees < 0) degrees += 360;

	return (
		laid.find(
			(arc) => arc.kind !== 'empty' && degrees >= arc.startAngle && degrees < arc.endAngle
		) ?? null
	);
}
