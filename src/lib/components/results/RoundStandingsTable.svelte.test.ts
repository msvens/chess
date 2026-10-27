import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { RatingAlgorithm, type PlayerInfoDto, type RoundStandingRow } from '$lib/api';
import RoundStandingsTable from './RoundStandingsTable.svelte';

const rows = [{ contenderId: 1, wins: 1, draws: 0, losses: 0, points: 1 }] as RoundStandingRow[];
const playerMap = new Map([
	[1, { id: 1, firstName: 'A', lastName: 'Player', elo: { rating: 1500 } } as PlayerInfoDto]
]);

describe('RoundStandingsTable', () => {
	it('shows the rating column in an Elo-rated group', () => {
		render(RoundStandingsTable, {
			props: { rows, playerMap, rankingAlgorithm: RatingAlgorithm.STANDARD_ELO }
		});
		expect(screen.getByRole('columnheader', { name: 'Elo' })).toBeInTheDocument();
	});

	it('leaves it out of a group that isn’t', () => {
		render(RoundStandingsTable, {
			props: { rows, playerMap, rankingAlgorithm: RatingAlgorithm.STANDARD_ELO, showRating: false }
		});
		expect(screen.queryByRole('columnheader', { name: 'Elo' })).toBeNull();
		expect(screen.getByRole('columnheader', { name: 'Namn' })).toBeInTheDocument();
	});
});
