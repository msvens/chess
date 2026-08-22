import { describe, it, expect } from 'vitest';
import { niceStep, niceTicks } from '../ticks';

/**
 * Captured from recharts itself — `getNiceTickValues([min, max], 5, true)` run
 * against the version the deployed site uses (3.7.0). These are the oracle: the
 * port is correct exactly insofar as it reproduces them.
 */
const RECHARTS: [number, number, number[]][] = [
	[1200, 1750, [1200, 1350, 1500, 1650, 1800]],
	[1200, 2480, [1200, 1600, 2000, 2400, 2800]],
	[1200, 1345, [1200, 1240, 1280, 1320, 1360]],
	[1200, 1210, [1200, 1203, 1206, 1209, 1212]],
	[1200, 2000, [1200, 1400, 1600, 1800, 2000]],
	[1200, 1500, [1200, 1275, 1350, 1425, 1500]],
	[1200, 1201, [1200, 1200.25, 1200.5, 1200.75, 1201]],
	[1200, 1200, [1198, 1199, 1200, 1201, 1202]],
	[1200, 3000, [1000, 1500, 2000, 2500, 3000]],
	[1200, 1235, [1200, 1210, 1220, 1230, 1240]],
	[1200, 1832, [1200, 1400, 1600, 1800, 2000]],
	[1200, 2145, [1200, 1500, 1800, 2100, 2400]],
	[1150, 1900, [1000, 1250, 1500, 1750, 2000]],
	[1000, 2900, [1000, 1500, 2000, 2500, 3000]],
	[1200, 1206, [1200, 1202, 1204, 1206, 1208]],
	[1200, 1600, [1200, 1300, 1400, 1500, 1600]]
];

describe('niceTicks matches recharts', () => {
	for (const [min, max, expected] of RECHARTS) {
		it(`[${min}, ${max}]`, () => {
			expect(niceTicks(min, max, 5)).toEqual(expected);
		});
	}
});

describe('niceStep', () => {
	it('rounds the ratio up to a multiple of 0.05, not to a 1/2/5 ladder', () => {
		// A textbook algorithm would give 100 and 2.5 here; recharts gives these,
		// and matching it is the whole point.
		expect(niceStep(137.5)).toBe(150);
		expect(niceStep(2.5)).toBe(3);
	});

	it('grows with the correction factor', () => {
		expect(niceStep(320, 1)).toBeGreaterThan(niceStep(320, 0));
	});

	it('is zero for a non-positive step', () => {
		expect(niceStep(0)).toBe(0);
		expect(niceStep(-5)).toBe(0);
	});
});

describe('niceTicks — the shape of the answer', () => {
	it('always covers the data', () => {
		for (const [min, max] of RECHARTS) {
			const ticks = niceTicks(min, max, 5);
			expect(ticks[0]).toBeLessThanOrEqual(min);
			expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(max);
		}
	});

	it('is evenly spaced', () => {
		for (const [min, max] of RECHARTS) {
			const ticks = niceTicks(min, max, 5);
			const step = ticks[1] - ticks[0];
			for (let i = 1; i < ticks.length; i++) {
				expect(ticks[i] - ticks[i - 1]).toBeCloseTo(step, 6);
			}
		}
	});

	it('carries no float noise', () => {
		// 0.30000000000000004 in a gridline label would be very visible.
		for (const [min, max] of RECHARTS) {
			for (const tick of niceTicks(min, max, 5)) {
				expect(String(tick)).not.toMatch(/\d{10}/);
			}
		}
	});

	it('handles a reversed range by reversing the answer', () => {
		expect(niceTicks(1750, 1200, 5)).toEqual([1800, 1650, 1500, 1350, 1200]);
	});

	it('gives nothing for a range it cannot read', () => {
		expect(niceTicks(NaN, 1500, 5)).toEqual([]);
		expect(niceTicks(1200, Infinity, 5)).toEqual([]);
	});
});
