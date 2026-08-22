/**
 * Monotone-cubic paths, reproducing recharts' `type="monotone"`.
 *
 * recharts draws its lines with d3-shape's `curveMonotoneX`, so joining the
 * points with straight segments would visibly change the shape of every line on
 * the chart. This is that algorithm — Steffen's method (Astronomy and
 * Astrophysics 239, 1990), as d3 implements it — ported directly.
 *
 * What monotone buys: the curve never overshoots. A rating that climbs to a
 * peak and falls away again cannot bulge above the peak on the way, which an
 * ordinary cubic spline would happily do and which would read as a rating the
 * player never had.
 */
export type Point = readonly [x: number, y: number];

const sign = (x: number) => (x < 0 ? -1 : 1);

/**
 * Tangent at the middle of three points.
 *
 * The `|| 0` at the end is load-bearing: it turns the NaN from a flat or
 * degenerate triple into a zero tangent, which is what keeps a plateau flat.
 */
function slope3(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): number {
	const h0 = x1 - x0;
	const h1 = x2 - x1;
	const s0 = (y1 - y0) / (h0 || (h1 < 0 ? -0 : 0));
	const s1 = (y2 - y1) / (h1 || (h0 < 0 ? -0 : 0));
	const p = (s0 * h1 + s1 * h0) / (h0 + h1);
	return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
}

/** One-sided tangent, for the two ends of the line. */
function slope2(x0: number, y0: number, x1: number, y1: number, t: number): number {
	const h = x1 - x0;
	return h ? ((3 * (y1 - y0)) / h - t) / 2 : t;
}

const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * A cubic Bézier from `(x0,y0)` to `(x1,y1)` with the given end tangents.
 *
 * Cubic Hermite interpolation expressed as a Bézier: the control points sit a
 * third of the way along in x, offset by the tangent.
 */
function segment(x0: number, y0: number, x1: number, y1: number, t0: number, t1: number): string {
	const dx = (x1 - x0) / 3;
	return (
		`C${round(x0 + dx)},${round(y0 + dx * t0)}` +
		` ${round(x1 - dx)},${round(y1 - dx * t1)}` +
		` ${round(x1)},${round(y1)}`
	);
}

/**
 * An SVG path through the points, monotone in x.
 *
 * Points must already be in x order and free of gaps — filtering out the
 * missing ones before calling is what reproduces recharts' `connectNulls`.
 */
export function monotonePath(points: readonly Point[]): string {
	if (points.length === 0) return '';

	// Coincident points are dropped, as d3 does; a repeated point would make the
	// tangent calculation divide by zero.
	const pts: Point[] = [];
	for (const [x, y] of points) {
		const last = pts[pts.length - 1];
		if (last && last[0] === x && last[1] === y) continue;
		pts.push([x, y]);
	}

	const [first] = pts;
	let path = `M${round(first[0])},${round(first[1])}`;
	if (pts.length === 1) return path;
	if (pts.length === 2) return `${path}L${round(pts[1][0])},${round(pts[1][1])}`;

	// The tangent at each interior point looks one step ahead, so the segment
	// being drawn always lags the point being read by one — exactly d3's state
	// machine, kept in that shape so the two cannot drift apart.
	let t0 = 0;
	for (let i = 2; i < pts.length; i++) {
		const [x0, y0] = pts[i - 2];
		const [x1, y1] = pts[i - 1];
		const [x2, y2] = pts[i];
		const t1 = slope3(x0, y0, x1, y1, x2, y2);
		const start = i === 2 ? slope2(x0, y0, x1, y1, t1) : t0;
		path += segment(x0, y0, x1, y1, start, t1);
		t0 = t1;
	}

	// The last segment gets a one-sided tangent at its far end.
	const [xn1, yn1] = pts[pts.length - 2];
	const [xn, yn] = pts[pts.length - 1];
	path += segment(xn1, yn1, xn, yn, t0, slope2(xn1, yn1, xn, yn, t0));

	return path;
}
