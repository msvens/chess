import { describe, it, expect } from 'vitest';
import { monotonePath, type Point } from './curve';

/**
 * Captured from d3-shape 3.2.0 — `line().curve(curveMonotoneX)` — which is what
 * recharts draws these lines with. The oracle for this port.
 *
 * d3 emits `Z` after a lone point and separates every number with a comma; the
 * comparison below reads the numbers out rather than matching the string, so
 * those formatting details are free to differ.
 */
const D3: [Point[], string][] = [
	[[[0, 100]], 'M0,100Z'],
	[
		[
			[0, 100],
			[50, 80]
		],
		'M0,100L50,80'
	],
	[
		[
			[0, 100],
			[50, 80],
			[100, 60]
		],
		'M0,100C16.667,93.333,33.333,86.667,50,80C66.667,73.333,83.333,66.667,100,60'
	],
	[
		[
			[0, 100],
			[50, 40],
			[100, 90],
			[150, 20]
		],
		'M0,100C16.667,70,33.333,40,50,40C66.667,40,83.333,90,100,90C116.667,90,133.333,55,150,20'
	],
	[
		[
			[0, 50],
			[40, 50],
			[80, 50],
			[120, 50]
		],
		'M0,50C13.333,50,26.667,50,40,50C53.333,50,66.667,50,80,50C93.333,50,106.667,50,120,50'
	],
	[
		[
			[0, 100],
			[40, 20],
			[80, 60],
			[120, 10],
			[160, 90],
			[200, 45]
		],
		'M0,100C13.333,60,26.667,20,40,20C53.333,20,66.667,60,80,60C93.333,60,106.667,10,120,10C133.333,10,146.667,90,160,90C173.333,90,186.667,67.5,200,45'
	],
	[
		[
			[0, 10],
			[30, 90],
			[60, 20],
			[90, 80],
			[120, 30],
			[150, 70],
			[180, 25]
		],
		'M0,10C10,50,20,90,30,90C40,90,50,20,60,20C70,20,80,80,90,80C100,80,110,30,120,30C130,30,140,70,150,70C160,70,170,47.5,180,25'
	]
];

/** The numbers in a path, in order — formatting and separators discarded. */
const numbersOf = (path: string) => (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
const commandsOf = (path: string) => (path.match(/[MLCZ]/g) ?? []).join('');

describe('monotonePath matches d3-shape', () => {
	for (const [points, expected] of D3) {
		it(`${points.length} point${points.length === 1 ? '' : 's'}`, () => {
			const mine = numbersOf(monotonePath(points));
			const theirs = numbersOf(expected);
			expect(mine).toHaveLength(theirs.length);
			mine.forEach((value, i) => expect(value).toBeCloseTo(theirs[i], 3));
		});
	}

	it('uses the same commands, bar d3’s trailing Z on a lone point', () => {
		for (const [points, expected] of D3) {
			expect(commandsOf(monotonePath(points))).toBe(commandsOf(expected).replace(/Z$/, ''));
		}
	});
});

describe('monotonePath — the edges', () => {
	it('draws nothing for no points', () => {
		expect(monotonePath([])).toBe('');
	});

	it('moves to a lone point without drawing', () => {
		expect(monotonePath([[10, 20]])).toBe('M10,20');
	});

	it('joins two points with a straight line, as d3 does', () => {
		expect(
			monotonePath([
				[0, 0],
				[10, 10]
			])
		).toBe('M0,0L10,10');
	});

	it('ignores a repeated point rather than dividing by zero', () => {
		const withDuplicate = monotonePath([
			[0, 100],
			[50, 80],
			[50, 80],
			[100, 60]
		]);
		const without = monotonePath([
			[0, 100],
			[50, 80],
			[100, 60]
		]);
		expect(withDuplicate).toBe(without);
	});

	it('stays flat across a plateau instead of bulging', () => {
		// Every control point must sit on the line. This is the `|| 0` in slope3:
		// without it a degenerate triple yields NaN and the path disappears.
		const path = monotonePath([
			[0, 50],
			[40, 50],
			[80, 50],
			[120, 50]
		]);
		expect(path).not.toContain('NaN');
		const ys = numbersOf(path).filter((_, i) => i % 2 === 1);
		expect(ys.every((y) => y === 50)).toBe(true);
	});

	it('never overshoots a peak — the reason for monotone at all', () => {
		// A rating that rises to 90 and falls away must not bulge above 90, or the
		// chart shows a rating the player never had.
		const points: Point[] = [
			[0, 100],
			[40, 20],
			[80, 60],
			[120, 10]
		];
		const ys = numbersOf(monotonePath(points)).filter((_, i) => i % 2 === 1);
		const dataMin = Math.min(...points.map((p) => p[1]));
		const dataMax = Math.max(...points.map((p) => p[1]));
		expect(Math.min(...ys)).toBeGreaterThanOrEqual(dataMin);
		expect(Math.max(...ys)).toBeLessThanOrEqual(dataMax);
	});

	it('passes through every input point', () => {
		const points: Point[] = [
			[0, 10],
			[30, 90],
			[60, 20],
			[90, 80]
		];
		const path = monotonePath(points);
		for (const [x, y] of points) expect(path).toContain(`${x},${y}`);
	});
});
