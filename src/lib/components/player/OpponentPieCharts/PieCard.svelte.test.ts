import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import PieCard from './PieCard.svelte';

const slices = [
	{ label: 'Vinster', value: 3, colour: '#22c55e' },
	{ label: 'Remier', value: 1, colour: '#6b7280' },
	{ label: 'Förluster', value: 1, colour: '#ef4444' }
];

describe('PieCard', () => {
	it('shows its legend by default', () => {
		render(PieCard, { title: 'Alla', slices, noGamesLabel: 'Inga partier' });
		expect(screen.getByText('Vinster')).toBeInTheDocument();
	});

	it('leaves the legend out when told to', () => {
		render(PieCard, { title: 'Alla', slices, noGamesLabel: 'Inga partier', showLegend: false });
		expect(screen.queryByText('Vinster')).toBeNull();
		expect(screen.getByText('Alla')).toBeInTheDocument();
	});
});
