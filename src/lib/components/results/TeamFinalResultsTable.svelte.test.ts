import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { NO_PLACE, type TeamTournamentEndResultDto } from '$lib/api';
import TeamFinalResultsTable from './TeamFinalResultsTable.svelte';

const team = (contenderId: number, place: number): TeamTournamentEndResultDto =>
	({
		contenderId,
		teamNumber: 1,
		place,
		points: 2,
		secPoints: 4.5,
		wonGames: 1,
		drawGames: 0,
		lostGames: 0
	}) as TeamTournamentEndResultDto;

const setup = (results: TeamTournamentEndResultDto[]) =>
	render(TeamFinalResultsTable, {
		props: { results, getClubName: (clubId: number) => `Klubb ${clubId}` }
	});

const positions = () =>
	within(screen.getAllByRole('rowgroup')[1])
		.getAllByRole('row')
		.map((row) => within(row).getAllByRole('cell')[0].textContent?.trim());

describe('TeamFinalResultsTable', () => {
	it('shows real placements as they are', () => {
		setup([team(1, 1), team(2, 2)]);
		expect(positions()).toEqual(['1', '2']);
	});

	it('shows a dash where the group has no placements yet', () => {
		// Team rows carry no rating, so there is nothing to seed them by — the
		// sentinel simply must not read as a ranking.
		setup([team(1, NO_PLACE), team(2, NO_PLACE)]);
		expect(positions()).toEqual(['-', '-']);
		expect(screen.queryByText(String(NO_PLACE))).not.toBeInTheDocument();
	});
});
