import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { JgpTournamentRef } from '$lib/data/jgp/types';
import JgpTournamentLegend from './JgpTournamentLegend.svelte';

const tournament = (tournamentId: number, label: string, date: string): JgpTournamentRef =>
	({ tournamentId, label, shortLabel: label, date, groups: [] }) as JgpTournamentRef;

describe('JgpTournamentLegend', () => {
	it('numbers the tournaments in column order, with their dates', () => {
		render(JgpTournamentLegend, {
			props: {
				tournaments: [
					tournament(6544, 'Tyresö JGP 2026', '2026-03-07'),
					tournament(6540, 'Trojanska Hästen', '2026-03-14')
				]
			}
		});

		const items = screen.getAllByRole('listitem');
		expect(items).toHaveLength(2);
		expect(items[0]).toHaveTextContent('1.');
		expect(items[0]).toHaveTextContent('Tyresö JGP 2026');
		expect(items[0]).toHaveTextContent('2026-03-07');
		expect(items[1]).toHaveTextContent('2.');
	});

	it('links each to its results page', () => {
		render(JgpTournamentLegend, {
			props: { tournaments: [tournament(6544, 'Tyresö JGP 2026', '2026-03-07')] }
		});
		expect(screen.getByRole('link', { name: 'Tyresö JGP 2026' })).toHaveAttribute(
			'href',
			'/results/6544'
		);
	});
});
