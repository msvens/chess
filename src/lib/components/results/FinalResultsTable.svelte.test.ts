import { render, screen } from '@testing-library/svelte';
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
});
