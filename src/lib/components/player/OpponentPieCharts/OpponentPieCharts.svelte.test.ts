import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { ColorStats } from '$lib/api';
import OpponentPieCharts from './OpponentPieCharts.svelte';

const stats = (wins: number, draws: number, losses: number): ColorStats => ({
	wins,
	draws,
	losses
});

const draw = (all: ColorStats, white = all, black = all) =>
	render(OpponentPieCharts, { all, white, black });

describe('the three cards', () => {
	it('names them overall, white and black', () => {
		draw(stats(10, 5, 5));
		expect(screen.getByText('Alla')).toBeInTheDocument();
		expect(screen.getByText('Vit')).toBeInTheDocument();
		expect(screen.getByText('Svart')).toBeInTheDocument();
	});

	it('renders nothing at all when the player has no games', () => {
		// Not three empty cards — the whole block goes, as in the original.
		const { container } = draw(stats(0, 0, 0));
		expect(container.textContent).toBe('');
	});

	it('says so on a colour that was never played, while the others draw', () => {
		// Reachable: a player whose games were all with one colour.
		draw(stats(10, 0, 0), stats(10, 0, 0), stats(0, 0, 0));
		expect(screen.getByText('Inga partier')).toBeInTheDocument();
	});
});

describe('the legend', () => {
	it('reads alphabetically, as recharts sorted it', () => {
		// Not wins/draws/losses: recharts sorts every legend by the displayed name.
		draw(stats(10, 5, 5));
		const labels = ['Förluster', 'Remier', 'Vinster'];
		const positions = labels.map((label) => document.body.textContent?.indexOf(label) ?? -1);
		expect(positions.every((i) => i >= 0)).toBe(true);
		expect([...positions].sort((a, b) => a - b)).toEqual(positions);
	});

	it('keeps a row for an outcome that never happened', () => {
		draw(stats(10, 0, 5));
		// Three cards, three rows each.
		expect(screen.getAllByText('Remier')).toHaveLength(3);
	});

	it('binds each colour to its outcome, not to a legend position', () => {
		draw(stats(10, 5, 5));
		const swatch = (label: string) =>
			[...document.querySelectorAll('span')]
				.find((span) => span.textContent?.trim() === label)
				?.querySelector('circle')
				?.getAttribute('fill');

		expect(swatch('Vinster')).toBe('#22c55e');
		expect(swatch('Remier')).toBe('#6b7280');
		expect(swatch('Förluster')).toBe('#ef4444');
	});
});

describe('reading the chart without a mouse', () => {
	it('gives each pie a text alternative the original never had', () => {
		draw(stats(10, 5, 5));
		expect(
			screen.getByRole('img', { name: 'Alla: Vinster 10, Remier 5, Förluster 5' })
		).toBeInTheDocument();
	});
});
