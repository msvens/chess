import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { createRawSnippet } from 'svelte';
import type { TeamTournamentEndResultDto, TournamentRoundResultDto } from '$lib/api';
import { ORGANIZATIONS_STATE_KEY, OrganizationsState } from '$lib/stores/organizations.svelte';
import TeamPairingSheet from './TeamPairingSheet.svelte';
import TeamStandingsSheet from './TeamStandingsSheet.svelte';

const sheetHeader = createRawSnippet(() => ({ render: () => '<header>Allsvenskan</header>' }));

const CLUBS: Record<number, string> = { 10: 'SK Rockaden', 20: 'Wasa SK' };

class TestOrganizations extends OrganizationsState {
	constructor() {
		super();
		this.loading = false;
	}
	override async load() {}
	override getClubName(orgNumber: number): string {
		return CLUBS[orgNumber] ?? `Org ${orgNumber}`;
	}
}

const context = () => new Map([[ORGANIZATIONS_STATE_KEY, new TestOrganizations()]]);

const standing = (over: Partial<TeamTournamentEndResultDto>): TeamTournamentEndResultDto =>
	({
		contenderId: 10,
		teamNumber: 1,
		place: 1,
		points: 12,
		secPoints: 28.5,
		...over
	}) as TeamTournamentEndResultDto;

const boardRow = (over: Partial<TournamentRoundResultDto>): TournamentRoundResultDto =>
	({
		id: 1,
		roundNr: 1,
		board: 1,
		homeId: 10,
		homeTeamNumber: 1,
		awayId: 20,
		awayTeamNumber: 1,
		homeResult: 0,
		awayResult: 0,
		games: [],
		...over
	}) as TournamentRoundResultDto;

const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row');
const cells = (rowIndex: number) => within(bodyRows()[rowIndex]).getAllByRole('cell');

describe('TeamPairingSheet', () => {
	const setup = (boardRows: TournamentRoundResultDto[], round = 1) =>
		render(TeamPairingSheet, {
			props: {
				round,
				boardRows,
				teamStandings: [standing({}), standing({ contenderId: 20, place: 2 })],
				fontPx: 13,
				sheetHeader,
				groupSuffix: ''
			},
			context: context()
		});

	it('lists the round matches with both club names', () => {
		setup([boardRow({ homeResult: 4.5, awayResult: 3.5 })]);
		const row = cells(0);
		expect(row[0]).toHaveTextContent('1');
		expect(row[1]).toHaveTextContent('SK Rockaden');
		expect(row[2]).toHaveTextContent('Wasa SK');
	});

	it('prints the match score with an en dash, as the sheet always has', () => {
		// The shared formatter writes "4 - 3" with a hyphen and halves as ½; this
		// sheet has always printed an en dash and a plain 4.5, and changing that
		// changes a printed value.
		setup([boardRow({ homeResult: 4.5, awayResult: 3.5 })]);
		expect(cells(0)[3]).toHaveTextContent('4.5 – 3.5');
	});

	it('leaves the score blank for a match that has not been played', () => {
		setup([boardRow({ homeResult: 0, awayResult: 0 })]);
		expect(cells(0)[3].textContent).toBe('');
	});

	it('groups the board rows of one match into a single line', () => {
		setup([
			boardRow({ id: 1, board: 1, homeResult: 1, awayResult: 0 }),
			boardRow({ id: 2, board: 2, homeResult: 0, awayResult: 1 })
		]);
		expect(bodyRows()).toHaveLength(1);
		expect(cells(0)[3]).toHaveTextContent('1 – 1');
	});

	it('keeps two teams of the same club apart', () => {
		setup([
			boardRow({ id: 1, homeId: 10, homeTeamNumber: 1, homeResult: 5, awayResult: 3 }),
			boardRow({ id: 2, homeId: 10, homeTeamNumber: 2, homeResult: 2, awayResult: 6 })
		]);
		expect(bodyRows()).toHaveLength(2);
	});

	it('leaves out the other rounds', () => {
		setup([boardRow({ id: 1, roundNr: 1 }), boardRow({ id: 2, roundNr: 2 })], 2);
		expect(bodyRows()).toHaveLength(1);
	});

	it('numbers the matches from one', () => {
		setup([
			boardRow({ id: 1, homeId: 10, homeResult: 5, awayResult: 3 }),
			boardRow({ id: 2, homeId: 20, awayId: 10, homeResult: 4, awayResult: 4 })
		]);
		expect(cells(0)[0]).toHaveTextContent('1');
		expect(cells(1)[0]).toHaveTextContent('2');
	});
});

describe('TeamStandingsSheet', () => {
	const setup = (standings: TeamTournamentEndResultDto[]) =>
		render(TeamStandingsSheet, {
			props: { standings, fontPx: 13, sheetHeader, groupSuffix: '' },
			context: context()
		});

	it('orders by place and shows match points and board points', () => {
		setup([
			standing({ contenderId: 20, place: 2, points: 8, secPoints: 22 }),
			standing({ contenderId: 10, place: 1, points: 12, secPoints: 28.5 })
		]);
		expect(cells(0)[0]).toHaveTextContent('1');
		expect(cells(0)[1]).toHaveTextContent('SK Rockaden');
		expect(cells(0)[2]).toHaveTextContent('12');
		expect(cells(0)[3]).toHaveTextContent('28.5');
		expect(cells(1)[1]).toHaveTextContent('Wasa SK');
	});

	it('says so when there are no standings', () => {
		setup([]);
		expect(screen.getByText('Ingen ställning tillgänglig')).toBeInTheDocument();
	});
});
