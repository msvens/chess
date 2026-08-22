import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { ResultCode, type GameDto, type TournamentRoundResultDto } from '$lib/api';
import TeamDetailMatches from './TeamDetailMatches.svelte';

const HOME_CLUB = 10;
const AWAY_CLUB = 20;

const game = (tableNr: number, whiteId: number, blackId: number, result?: number): GameDto =>
	({ tableNr, whiteId, blackId, result }) as GameDto;

const match = (over: Partial<TournamentRoundResultDto> = {}): TournamentRoundResultDto =>
	({
		roundNr: 1,
		homeId: HOME_CLUB,
		homeTeamNumber: 1,
		awayId: AWAY_CLUB,
		awayTeamNumber: 1,
		homeResult: 3,
		awayResult: 5,
		date: '2026-01-15',
		// Board 1 is tableNr 0, where the away team has white. White wins, so the
		// point belongs to the away side.
		games: [game(0, 111, 222, ResultCode.WHITE_WIN)],
		...over
	}) as TournamentRoundResultDto;

function setup(over: Record<string, unknown> = {}) {
	const rows = [match()];
	render(TeamDetailMatches, {
		props: {
			matches: rows,
			allRoundResults: rows,
			selectedClubId: HOME_CLUB,
			selectedTeamNumber: 1,
			getClubName: (id: number) => `Club ${id}`,
			getPlayerName: (id: number) => `Player ${id}`,
			getPlayerEloByDate: (id: number) => `${1500 + id}`,
			tournamentId: 5814,
			groupId: 16559,
			...over
		}
	});
}

describe('TeamDetailMatches', () => {
	it('puts the selected team in the left column when it played at home', () => {
		setup();
		const headers = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim());
		expect(headers[1]).toBe('Club 10');
		expect(headers[3]).toBe('Club 20');
	});

	it('puts the selected team in the left column when it played away', () => {
		// The whole point of the flip: this team reads on the left whichever side
		// it actually was.
		setup({ selectedClubId: AWAY_CLUB });
		const headers = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim());
		expect(headers[1]).toBe('Club 20');
		expect(headers[3]).toBe('Club 10');
	});

	it('reads the board result from the selected team’s side', () => {
		// Board 1: the away team has white and wins. Home sees 0 - 1...
		setup();
		expect(screen.getByRole('cell', { name: '0 - 1' })).toBeInTheDocument();
	});

	it('reads the same board the other way for the away team', () => {
		// ...and away sees 1 - 0. Reading the result code directly would credit
		// the wrong side.
		setup({ selectedClubId: AWAY_CLUB });
		expect(screen.getByRole('cell', { name: '1 - 0' })).toBeInTheDocument();
	});

	it('shows the match score from the selected team’s side', () => {
		setup();
		expect(screen.getByText(/3-5/)).toBeInTheDocument();
	});

	it('renders the match score with no spaces, as the live site does', () => {
		// Deliberately NOT `formatTeamMatchScore`, which would give "3 - 5". The
		// group page and this page disagree on purpose; see the component.
		setup();
		expect(screen.queryByText(/3 - 5/)).toBeNull();
	});

	it('reads an unplayed match as no result rather than 0-0', () => {
		const rows = [match({ homeResult: 0, awayResult: 0 })];
		render(TeamDetailMatches, {
			props: {
				matches: rows,
				allRoundResults: rows,
				selectedClubId: HOME_CLUB,
				selectedTeamNumber: 1,
				getClubName: (id: number) => `Club ${id}`,
				getPlayerName: (id: number) => `Player ${id}`,
				getPlayerEloByDate: () => '-',
				tournamentId: 5814,
				groupId: 16559
			}
		});
		expect(screen.queryByText(/0-0/)).toBeNull();
	});

	it('links a real opponent to their page', () => {
		setup();
		const link = screen.getByRole('link', { name: 'Player 111' });
		expect(link).toHaveAttribute('href', '/results/5814/16559/111');
	});

	it('renders an empty slot as plain text, never as a link to a negative id', () => {
		// -100 is a bye. Linking it would point at a route that resolves to nothing.
		const rows = [match({ games: [game(0, 111, -100, ResultCode.WHITE_WIN)] })];
		render(TeamDetailMatches, {
			props: {
				matches: rows,
				allRoundResults: rows,
				selectedClubId: HOME_CLUB,
				selectedTeamNumber: 1,
				getClubName: (id: number) => `Club ${id}`,
				getPlayerName: (id: number) => `Player ${id}`,
				getPlayerEloByDate: () => '1500',
				tournamentId: 5814,
				groupId: 16559
			}
		});
		expect(screen.queryByRole('link', { name: /-100/ })).toBeNull();
	});

	it('says so when the team played no matches', () => {
		render(TeamDetailMatches, {
			props: {
				matches: [],
				allRoundResults: [],
				selectedClubId: HOME_CLUB,
				selectedTeamNumber: 1,
				getClubName: (id: number) => `Club ${id}`,
				getPlayerName: (id: number) => `Player ${id}`,
				getPlayerEloByDate: () => '-',
				tournamentId: 5814,
				groupId: 16559
			}
		});
		expect(screen.queryAllByRole('table')).toHaveLength(0);
	});

	it('dates each match in the long form this page uses', () => {
		// The group page's round tabs use the compact "26-01-15"; here there is
		// room for the spelled-out month.
		setup();
		const header = screen.getByText(/Rond 1/);
		expect(within(header.parentElement as HTMLElement).getByText(/januari/)).toBeInTheDocument();
	});
});
