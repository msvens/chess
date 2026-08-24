import { describe, expect, it } from 'vitest';
import {
	arcs,
	legendOrder,
	pieRadius,
	pointAt,
	sliceAt,
	slicePercent,
	tooltipText,
	type Slice
} from './pie';

const near = (value: number, expected: number) => expect(value).toBeCloseTo(expected, 6);

const slice = (label: string, value: number, colour = '#000'): Slice => ({ label, value, colour });

describe('where an angle lands', () => {
	it('puts zero degrees at three o’clock', () => {
		const [x, y] = pointAt(100, 100, 50, 0);
		near(x, 150);
		near(y, 100);
	});

	it('grows counter-clockwise, so ninety degrees is twelve o’clock', () => {
		// recharts negates the angle before taking cos/sin. Getting this backwards
		// mirrors every chart.
		const [x, y] = pointAt(100, 100, 50, 90);
		near(x, 100);
		near(y, 50);
	});

	it('puts 180 degrees at nine o’clock', () => {
		const [x, y] = pointAt(100, 100, 50, 180);
		near(x, 50);
		near(y, 100);
	});
});

describe('how big the pie is', () => {
	it('halves the smaller side, less the margin, then takes 90%', () => {
		// 200 wide, 176 tall → (176 - 10) / 2 = 83 → 74.7
		expect(pieRadius(200, 176)).toBeCloseTo(74.7, 5);
	});

	it('is bounded by width on a narrow card', () => {
		expect(pieRadius(100, 176)).toBeCloseTo(40.5, 5);
	});

	it('does not fold to zero on a box smaller than the margin', () => {
		// recharts takes `Math.abs` of the inner size, so a 4px box yields a
		// positive radius rather than nothing. Faithful, but it means the caller
		// must not draw before it has measured — a card of width 0 would show a
		// 4.5px pie. `OpponentPieCharts` gates on the measured width for this
		// reason.
		expect(pieRadius(4, 4)).toBeCloseTo(2.7, 5);
		expect(pieRadius(0, 0)).toBeCloseTo(4.5, 5);
	});
});

describe('laying out the wedges', () => {
	it('has nothing to draw when every slice is zero', () => {
		expect(arcs([slice('W', 0), slice('D', 0)], 100, 100, 50)).toEqual([]);
	});

	it('starts the first wedge at three o’clock', () => {
		const [first] = arcs([slice('W', 1), slice('D', 3)], 100, 100, 50);
		expect(first.path).toContain('L 150 100');
	});

	it('sweeps counter-clockwise — a quarter ends at twelve o’clock', () => {
		const [first] = arcs([slice('W', 1), slice('D', 3)], 100, 100, 50);
		// The arc's end point, and sweep-flag 0 for the counter-clockwise direction.
		expect(first.path).toMatch(/A 50 50 0 0 0 100(\.0+)? 50/);
	});

	it('sets the large-arc flag past a half turn', () => {
		const [big] = arcs([slice('W', 3), slice('D', 1)], 100, 100, 50);
		expect(big.path).toContain('A 50 50 0 1 0');
	});

	it('draws a lone slice as a circle, not an arc', () => {
		// A 360° arc starts and ends at the same point, which SVG draws as nothing.
		const [only] = arcs([slice('W', 5), slice('D', 0), slice('L', 0)], 100, 100, 50);
		expect(only.kind).toBe('whole');
		expect(only.percent).toBe(1);
	});

	it('marks a zero slice as nothing to draw, but keeps it', () => {
		// It still needs a legend row, so it cannot simply be filtered out.
		const [, draws] = arcs([slice('W', 5), slice('D', 0), slice('L', 5)], 100, 100, 50);
		expect(draws.kind).toBe('empty');
		expect(draws.percent).toBe(0);
	});

	it('keeps the wedges in the order given, since colour follows position', () => {
		const laid = arcs(
			[slice('W', 1, '#22c55e'), slice('D', 1, '#6b7280'), slice('L', 1, '#ef4444')],
			100,
			100,
			50
		);
		expect(laid.map((a) => a.colour)).toEqual(['#22c55e', '#6b7280', '#ef4444']);
	});

	it('lays each wedge where the last one stopped', () => {
		const laid = arcs([slice('W', 1), slice('D', 1), slice('L', 2)], 100, 100, 50);
		// Quarter, quarter, half — the third starts at 180°, nine o’clock.
		expect(laid[2].path).toContain('L 50');
	});

	it('puts the label at half the radius, on the wedge’s midline', () => {
		const [only] = arcs([slice('W', 1)], 100, 100, 50);
		// A whole circle's midpoint is 180°, so the label sits left of centre.
		near(only.labelX, 75);
		near(only.labelY, 100);
	});
});

describe('what the labels say', () => {
	it('rounds the slice percentage to a whole number', () => {
		expect(slicePercent(0.148)).toBe('15%');
	});

	it('gives the tooltip one decimal, where the slice has none', () => {
		expect(tooltipText({ label: 'Vinster', value: 34, percent: 0.1478 })).toBe(
			'Vinster: 34 (14.8%)'
		);
	});
});

describe('the legend order', () => {
	it('is alphabetical, as recharts sorted it — not wins, draws, losses', () => {
		const swedish = [slice('Vinster', 3), slice('Remier', 2), slice('Förluster', 1)];
		expect(legendOrder(swedish).map((s) => s.label)).toEqual(['Förluster', 'Remier', 'Vinster']);
	});

	it('lands on a different order in English, which is why it is sorted at all', () => {
		const english = [slice('Wins', 3), slice('Draws', 2), slice('Losses', 1)];
		expect(legendOrder(english).map((s) => s.label)).toEqual(['Draws', 'Losses', 'Wins']);
	});

	it('leaves the wedge order alone', () => {
		const slices = [slice('Wins', 3), slice('Draws', 2), slice('Losses', 1)];
		legendOrder(slices);
		expect(slices.map((s) => s.label)).toEqual(['Wins', 'Draws', 'Losses']);
	});
});

describe('finding the wedge under the pointer', () => {
	const laid = arcs([slice('W', 1), slice('D', 1), slice('L', 2)], 100, 100, 50);

	it('finds nothing outside the pie', () => {
		expect(sliceAt(laid, 100, 100, 50, 200, 200)).toBeNull();
	});

	it('finds the first wedge just above three o’clock', () => {
		// Angles grow counter-clockwise, so "just inside the first wedge" is
		// slightly above the horizontal, not below it.
		expect(sliceAt(laid, 100, 100, 50, 130, 95)?.label).toBe('W');
	});

	it('finds the second wedge past twelve o’clock', () => {
		expect(sliceAt(laid, 100, 100, 50, 95, 70)?.label).toBe('D');
	});

	it('finds the half-sized third wedge below the centre', () => {
		expect(sliceAt(laid, 100, 100, 50, 100, 130)?.label).toBe('L');
	});

	it('finds the wedge at the very centre', () => {
		expect(sliceAt(laid, 100, 100, 50, 100, 100)).not.toBeNull();
	});

	it('never lands on a slice worth nothing', () => {
		const withZero = arcs([slice('W', 5), slice('D', 0), slice('L', 5)], 100, 100, 50);
		const hits = [
			[130, 95],
			[100, 70],
			[70, 105],
			[100, 130]
		].map(([x, y]) => sliceAt(withZero, 100, 100, 50, x, y)?.label);
		expect(hits).not.toContain('D');
	});

	it('finds the lone wedge anywhere inside, when one player has won everything', () => {
		const whole = arcs([slice('W', 5), slice('D', 0), slice('L', 0)], 100, 100, 50);
		expect(sliceAt(whole, 100, 100, 50, 120, 120)?.label).toBe('W');
	});
});
