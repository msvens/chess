import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { NO_PLACE, type TeamTournamentEndResultDto } from '$lib/api';
import TeamFinalResultsTable from './TeamFinalResultsTable.svelte';

const team = (contenderId: number, place: number): TeamTournamentEndResultDto =>
	({
		contenderId,
		teamNumber: 1,
		club: { id: contenderId, name: `Klubb ${contenderId}` },
		team: null,
		place,
		points: 2,
		secPoints: 4.5,
		wonGames: 1,
		drawGames: 0,
		lostGames: 0
	}) as TeamTournamentEndResultDto;

/** A school team: the name travels on `team`, and there is no club at all. */
const school = (contenderId: number, name: string): TeamTournamentEndResultDto =>
	({
		contenderId,
		teamNumber: -1,
		club: null,
		team: { id: contenderId, name },
		place: 1,
		points: 2,
		secPoints: 4.5,
		wonGames: 1,
		drawGames: 0,
		lostGames: 0
	}) as TeamTournamentEndResultDto;

const setup = (results: TeamTournamentEndResultDto[]) =>
	render(TeamFinalResultsTable, { props: { results } });

const teamNames = () =>
	within(screen.getAllByRole('rowgroup')[1])
		.getAllByRole('row')
		.map((row) => within(row).getAllByRole('cell')[1].textContent?.trim());

const positions = () =>
	within(screen.getAllByRole('rowgroup')[1])
		.getAllByRole('row')
		.map((row) => within(row).getAllByRole('cell')[0].textContent?.trim());

describe('TeamFinalResultsTable', () => {
	it('shows real placements as they are', () => {
		setup([team(1, 1), team(2, 2)]);
		expect(positions()).toEqual(['1', '2']);
	});

	it('names a school team from its own row, where there is no club', () => {
		// The regression this change exists to prevent: these used to render as
		// `Org 16196`, because the name had nowhere to come from.
		setup([school(16196, 'Bilingual Montessori School of Lund'), school(16342, 'Söraskolan L1')]);
		expect(teamNames()).toEqual(['Bilingual Montessori School of Lund', 'Söraskolan L1']);
	});

	it('names a club team from its row', () => {
		setup([team(10, 1)]);
		expect(teamNames()).toEqual(['Klubb 10']);
	});

	it('shows a dash where the group has no placements yet', () => {
		// Team rows carry no rating, so there is nothing to seed them by — the
		// sentinel simply must not read as a ranking.
		setup([team(1, NO_PLACE), team(2, NO_PLACE)]);
		expect(positions()).toEqual(['-', '-']);
		expect(screen.queryByText(String(NO_PLACE))).not.toBeInTheDocument();
	});
});
