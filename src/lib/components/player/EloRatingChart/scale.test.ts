import { describe, it, expect } from 'vitest';
import {
	labelIndices,
	labelInterval,
	linearScale,
	nearestIndex,
	pointScale,
	tooltipX,
	tooltipY
} from './scale';

describe('linearScale', () => {
	it('maps the ends of the domain onto the ends of the range', () => {
		const y = linearScale([1200, 1800], [400, 0]);
		expect(y(1200)).toBe(400);
		expect(y(1800)).toBe(0);
	});

	it('is linear in between', () => {
		const y = linearScale([1200, 1800], [400, 0]);
		expect(y(1500)).toBe(200);
	});

	it('handles the inverted range a Y axis needs', () => {
		// Pixels grow downward, ratings upward, so a higher rating is a smaller y.
		const y = linearScale([1200, 1800], [400, 0]);
		expect(y(1700)).toBeLessThan(y(1300));
	});

	it('extrapolates outside the domain rather than clamping', () => {
		// The plot is clipped instead; clamping here would flatten a line against
		// the axis and hide that it left the visible range.
		const y = linearScale([1200, 1800], [400, 0]);
		expect(y(1900)).toBeLessThan(0);
	});

	it('pins a zero-width domain to the middle instead of dividing by zero', () => {
		const y = linearScale([1500, 1500], [400, 0]);
		expect(y(1500)).toBe(200);
	});
});

describe('pointScale', () => {
	it('puts the ends of the data on the ends of the plot', () => {
		const x = pointScale(5, [40, 640]);
		expect(x(0)).toBe(40);
		expect(x(4)).toBe(640);
	});

	it('spreads the rest evenly', () => {
		const x = pointScale(5, [0, 400]);
		expect([x(0), x(1), x(2), x(3), x(4)]).toEqual([0, 100, 200, 300, 400]);
	});

	it('centres a lone reading', () => {
		expect(pointScale(1, [40, 640])(0)).toBe(340);
	});
});

describe('labelInterval', () => {
	it('shows every label when they all fit', () => {
		expect(labelInterval(6, 600)).toBe(1);
	});

	it('thins them when they do not', () => {
		// 24 months in a phone-width plot cannot all be labelled.
		expect(labelInterval(24, 300)).toBeGreaterThan(1);
	});

	it('never returns zero, which would loop forever', () => {
		expect(labelInterval(100, 1)).toBeGreaterThanOrEqual(1);
		expect(labelInterval(0, 0)).toBe(1);
	});
});

describe('labelIndices', () => {
	it('always keeps the last label', () => {
		// The rightmost point is the most recent rating; an unlabelled right-hand
		// end reads as a truncated axis.
		for (const [count, width] of [
			[24, 300],
			[12, 640],
			[7, 200],
			[60, 1440]
		]) {
			const indices = labelIndices(count, width);
			expect(indices[indices.length - 1]).toBe(count - 1);
		}
	});

	it('is every label when they fit', () => {
		expect(labelIndices(5, 600)).toEqual([0, 1, 2, 3, 4]);
	});

	it('is evenly spaced when thinned', () => {
		const indices = labelIndices(24, 300);
		const step = indices[1] - indices[0];
		for (let i = 1; i < indices.length; i++) {
			expect(indices[i] - indices[i - 1]).toBe(step);
		}
	});

	it('is empty for no readings', () => {
		expect(labelIndices(0, 600)).toEqual([]);
	});
});

describe('nearestIndex', () => {
	it('finds the reading under the pointer', () => {
		expect(nearestIndex(0, 5, [0, 400])).toBe(0);
		expect(nearestIndex(200, 5, [0, 400])).toBe(2);
		expect(nearestIndex(400, 5, [0, 400])).toBe(4);
	});

	it('picks the nearer neighbour between two readings', () => {
		expect(nearestIndex(149, 5, [0, 400])).toBe(1);
		expect(nearestIndex(151, 5, [0, 400])).toBe(2);
	});

	it('clamps outside the plot rather than reporting nothing', () => {
		expect(nearestIndex(-50, 5, [0, 400])).toBe(0);
		expect(nearestIndex(999, 5, [0, 400])).toBe(4);
	});

	it('has nothing to find without readings', () => {
		expect(nearestIndex(100, 0, [0, 400])).toBe(-1);
	});
});

describe('tooltipX', () => {
	const PLOT: readonly [number, number] = [40, 333];
	const CONTAINER = 343;
	const TIP = 130;
	const dots = Array.from({ length: 12 }, (_, i) => 40 + (i / 11) * (333 - 40));
	const positions = dots.map((x) => tooltipX(x, TIP, PLOT, CONTAINER));

	it('sits to the right of the first reading', () => {
		expect(positions[0]).toBeGreaterThan(dots[0]);
	});

	it('sits to the left of the last', () => {
		expect(positions[positions.length - 1] + TIP).toBeLessThan(dots[dots.length - 1] + 1);
	});

	it('moves for every reading — never two in the same place', () => {
		// The bug this replaced: clamping to the right edge pinned six of these
		// twelve at one position, so moving between them looked like nothing had
		// happened.
		expect(new Set(positions).size).toBe(positions.length);
	});

	it('moves in one direction, so it never jumps sides', () => {
		for (let i = 1; i < positions.length; i++) {
			expect(positions[i]).toBeGreaterThan(positions[i - 1]);
		}
	});

	it('stays inside the container at both ends', () => {
		for (const x of [0, 40, 170, 333, 400]) {
			const left = tooltipX(x, TIP, PLOT, CONTAINER);
			expect(left).toBeGreaterThanOrEqual(0);
			expect(left + TIP).toBeLessThanOrEqual(CONTAINER);
		}
	});

	it('gives up gracefully when the tooltip is wider than the container', () => {
		expect(tooltipX(100, 500, PLOT, CONTAINER)).toBe(0);
	});

	it('does not divide by zero on a zero-width plot', () => {
		expect(Number.isFinite(tooltipX(40, TIP, [40, 40], CONTAINER))).toBe(true);
	});
});

describe('tooltipY', () => {
	const HEIGHT = 400;
	const TIP = 90;

	it('sits below the lowest reading, so it covers none of them', () => {
		const dots = [120, 180, 240];
		const top = tooltipY(dots, TIP, HEIGHT);
		expect(top).toBeGreaterThan(Math.max(...dots));
	});

	it('goes above them when there is no room below', () => {
		// Readings near the floor of the chart: below would run off the bottom.
		const dots = [330, 350];
		const top = tooltipY(dots, TIP, HEIGHT);
		expect(top + TIP).toBeLessThan(Math.min(...dots));
	});

	it('never covers the readings either way', () => {
		for (const dots of [[20, 60], [120, 180, 240], [330, 350], [200]]) {
			const top = tooltipY(dots, TIP, HEIGHT);
			const clear = top > Math.max(...dots) || top + TIP < Math.min(...dots);
			expect(clear).toBe(true);
		}
	});

	it('stays inside the chart', () => {
		for (const dots of [[5], [200], [395]]) {
			const top = tooltipY(dots, TIP, HEIGHT);
			expect(top).toBeGreaterThanOrEqual(0);
			expect(top + TIP).toBeLessThanOrEqual(HEIGHT);
		}
	});

	it('has nowhere to go without readings', () => {
		expect(tooltipY([], TIP, HEIGHT)).toBe(0);
	});
});
