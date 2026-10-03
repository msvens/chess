import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RatingDataPoint } from '$lib/api';
import EloRatingChart from './EloRatingChart.svelte';

const getPlayerRatingHistory = vi.fn();

vi.mock('$lib/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api')>();
	return {
		...actual,
		getPlayerRatingHistory: (...args: unknown[]) => getPlayerRatingHistory(...args)
	};
});

const labels = { standard: 'Elo', rapid: 'Snabb Elo', blitz: 'Blixt Elo', lask: 'LASK' };

/** Two months, every series present, so all four lines and legend entries exist. */
const history: RatingDataPoint[] = [
	{ date: '2025-01', standard: 2600, rapid: 2500, blitz: 2400, lask: 2300 },
	{ date: '2025-02', standard: 2610, rapid: 2510, blitz: 2410, lask: 2310 }
];

function draw(over: Partial<Record<string, unknown>> = {}) {
	render(EloRatingChart, {
		props: {
			memberId: 348805,
			labels,
			loadingLabel: 'Laddar...',
			errorLabel: 'Fel',
			emptyLabel: 'Ingen historik',
			ariaLabel: 'Ratinghistorik',
			...over
		}
	});
}

describe('the legend', () => {
	beforeEach(() => {
		getPlayerRatingHistory.mockReset();
		getPlayerRatingHistory.mockResolvedValue({ status: 200, data: history });
	});

	it('reads alphabetically by label, as recharts sorted it', async () => {
		// recharts' Legend defaults to `itemSorter: 'value'`, so the live chart
		// reads Blixt, Elo, LASK, Snabb — not the order the lines are declared in.
		draw();
		await screen.findByText('LASK');

		const shown = [labels.blitz, labels.standard, labels.lask, labels.rapid];
		const order = shown.map((label) => document.body.textContent?.indexOf(label) ?? -1);
		expect(order.every((i) => i >= 0)).toBe(true);
		expect([...order].sort((a, b) => a - b)).toEqual(order);
	});

	it('keeps each series on its own colour', async () => {
		// Colour is bound to the series, not to a position in the legend.
		draw();
		await screen.findByText('LASK');

		const swatch = (label: string) =>
			[...document.querySelectorAll('span')]
				.find((span) => span.textContent?.trim() === label)
				?.querySelector('circle')
				?.getAttribute('fill');

		expect(swatch(labels.lask)).toBe('#d97706');
		expect(swatch(labels.standard)).toBe('#0284c7');
		expect(swatch(labels.rapid)).toBe('#be123c');
		expect(swatch(labels.blitz)).toBe('#059669');
	});
});

describe('the tooltip', () => {
	beforeEach(() => {
		getPlayerRatingHistory.mockReset();
		getPlayerRatingHistory.mockResolvedValue({ status: 200, data: history });
	});

	// jsdom lays the chart out at x 0 with the 640px fallback width, so the two
	// readings sit at the plot's edges: 40 and 630.
	const FIRST = 40;
	const SECOND = 630;
	const tooltipFor = (rating: number) => screen.queryByText(`Elo: ${rating}`);

	async function chart() {
		draw();
		return screen.findByRole('img', { name: 'Ratinghistorik' });
	}

	it('follows a mouse and goes when it leaves', async () => {
		const box = await chart();
		await fireEvent.pointerMove(box, { pointerType: 'mouse', clientX: FIRST });
		expect(tooltipFor(2600)).toBeInTheDocument();

		await fireEvent.pointerLeave(box, { pointerType: 'mouse' });
		expect(tooltipFor(2600)).not.toBeInTheDocument();
	});

	/** Where the Elo (standard) series draws its dot for a reading. */
	function eloDot(x: number) {
		const circle = [...document.querySelectorAll('circle')].find(
			(c) => c.getAttribute('fill') === '#0284c7' && Number(c.getAttribute('cx')) === x
		);
		return { clientX: x, clientY: Number(circle?.getAttribute('cy')) };
	}

	const tap = (target: Element, at: { clientX?: number; clientY?: number } = {}) =>
		fireEvent.pointerUp(target, { pointerType: 'touch', ...at });

	it('pins on a tap on a dot and survives the pointerleave a touch fires on lifting', async () => {
		const box = await chart();
		await tap(box, eloDot(SECOND));
		await fireEvent.pointerLeave(box, { pointerType: 'touch' });
		expect(tooltipFor(2610)).toBeInTheDocument();
	});

	it('accepts a tap a fingertip away from the dot', async () => {
		const box = await chart();
		const dot = eloDot(FIRST);
		await tap(box, { clientX: dot.clientX + 10, clientY: dot.clientY + 10 });
		expect(tooltipFor(2600)).toBeInTheDocument();
	});

	it('moves to another reading on a tap on its dot', async () => {
		const box = await chart();
		await tap(box, eloDot(FIRST));
		await tap(box, eloDot(SECOND));
		expect(tooltipFor(2600)).not.toBeInTheDocument();
		expect(tooltipFor(2610)).toBeInTheDocument();
	});

	it('closes on a second tap on the same dot', async () => {
		const box = await chart();
		await tap(box, eloDot(FIRST));
		await tap(box, eloDot(FIRST));
		expect(tooltipFor(2600)).not.toBeInTheDocument();
	});

	it('closes on a tap on empty chart rather than snapping to the nearest reading', async () => {
		// Snapping is what the mouse does, but on touch it left nowhere in the
		// chart to tap for closing.
		const box = await chart();
		await tap(box, eloDot(FIRST));
		await tap(box, { clientX: 320, clientY: 380 });
		expect(tooltipFor(2600)).not.toBeInTheDocument();
		expect(tooltipFor(2610)).not.toBeInTheDocument();
	});

	it('does not open on a tap on empty chart', async () => {
		const box = await chart();
		await tap(box, { clientX: 320, clientY: 380 });
		expect(document.body.textContent).not.toMatch(/Elo: \d/);
	});

	it('closes on a tap outside the chart', async () => {
		const box = await chart();
		await tap(box, eloDot(FIRST));
		await tap(document.body);
		expect(tooltipFor(2600)).not.toBeInTheDocument();
	});

	it('ignores a touch moving across the chart, which is a scroll', async () => {
		const box = await chart();
		await fireEvent.pointerMove(box, { pointerType: 'touch', clientX: FIRST });
		expect(tooltipFor(2600)).not.toBeInTheDocument();
	});
});
