import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RatingAlgorithm, type TournamentEndResultDto } from '$lib/api';
import FinalResultsTable from './FinalResultsTable.svelte';

const results = [
	{
		contenderId: 1,
		place: 1,
		points: 3,
		playerInfo: {
			id: 1,
			firstName: 'A',
			lastName: 'Player',
			club: 'SK Test',
			elo: { rating: 1500 }
		}
	}
] as TournamentEndResultDto[];

describe('FinalResultsTable', () => {
	it('shows the rating column in an Elo-rated group', () => {
		render(FinalResultsTable, {
			props: { results, rankingAlgorithm: RatingAlgorithm.STANDARD_ELO }
		});
		expect(screen.getByRole('columnheader', { name: 'Elo' })).toBeInTheDocument();
	});

	it('leaves it out of a group that isn’t', () => {
		render(FinalResultsTable, {
			props: { results, rankingAlgorithm: RatingAlgorithm.STANDARD_ELO, showRating: false }
		});
		expect(screen.queryByRole('columnheader', { name: 'Elo' })).toBeNull();
		expect(screen.getByRole('columnheader', { name: 'Namn' })).toBeInTheDocument();
	});

	it('sorts names surname first, Swedish style: Å before Ä, both after Z', async () => {
		const player = (id: number, firstName: string, lastName: string) =>
			({
				contenderId: id,
				place: id,
				points: 1,
				playerInfo: { id, firstName, lastName, club: 'SK', elo: { rating: 1500 } }
			}) as TournamentEndResultDto;
		render(FinalResultsTable, {
			props: {
				results: [
					player(1, 'Eva', 'Ärlig'),
					player(2, 'Bo', 'Zetterberg'),
					player(3, 'Al', 'Åberg'),
					player(4, 'Cy', 'andersson')
				],
				rankingAlgorithm: RatingAlgorithm.STANDARD_ELO
			}
		});
		await userEvent.setup().click(screen.getByRole('columnheader', { name: /Namn/ }));
		const names = screen
			.getAllByRole('row')
			.slice(1)
			.map((row) => row.querySelectorAll('td')[1]?.textContent?.trim());
		expect(names).toEqual(['Cy andersson', 'Bo Zetterberg', 'Al Åberg', 'Eva Ärlig']);
	});
});
