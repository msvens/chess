import { render, screen } from '@testing-library/svelte';
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
