import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { TournamentDto } from '$lib/api';
import type { TournamentParticipation } from '$lib/player/participations';
import PlayerTournamentList from './PlayerTournamentList.svelte';

const tournament = (over: Partial<TournamentDto> = {}): TournamentDto =>
	({ id: 6084, name: 'Rilton Cup', city: 'Stockholm', ...over }) as TournamentDto;

const row = (over: Partial<TournamentParticipation> = {}): TournamentParticipation => ({
	groupId: 17040,
	tournament: tournament(),
	gameCount: 9,
	groupName: 'Grupp A',
	groupStartDate: '2025-06-27',
	groupEndDate: '2025-07-06',
	className: 'Elit',
	hasMultipleClasses: false,
	isTeam: false,
	wins: 5,
	draws: 3,
	losses: 1,
	totalPoints: 6.5,
	...over
});

describe('a history row', () => {
	it('counts the tournaments while they load, once their number is known', () => {
		render(PlayerTournamentList, {
			tournaments: [],
			loading: true,
			progress: { done: 23, total: 62 }
		});
		expect(screen.getByText(/23.*62/)).toBeInTheDocument();
	});

	it('says only that it is loading before the number is known', () => {
		render(PlayerTournamentList, {
			tournaments: [],
			loading: true,
			progress: { done: 0, total: 0 }
		});
		expect(screen.queryByText(/\d+.*\d+/)).toBeNull();
	});

	it('links the name to the group it is for', () => {
		render(PlayerTournamentList, { tournaments: [row()], memberId: 408550 });
		expect(screen.getByRole('link', { name: /Rilton Cup/ })).toHaveAttribute(
			'href',
			'/results/6084/17040'
		);
	});

	it('links the score to the player’s games in that group', () => {
		render(PlayerTournamentList, { tournaments: [row()], memberId: 408550 });
		expect(screen.getByRole('link', { name: /Poäng: 6.5/ })).toHaveAttribute(
			'href',
			'/results/6084/17040/408550'
		);
	});

	it('has no score link for an event not yet played', () => {
		render(PlayerTournamentList, {
			tournaments: [row({ isUpcoming: true })],
			memberId: 408550
		});
		expect(screen.getAllByRole('link')).toHaveLength(1);
	});

	it('shows the points and the W/D/L split', () => {
		render(PlayerTournamentList, { tournaments: [row()] });
		expect(screen.getByText('Poäng: 6.5')).toBeInTheDocument();
		expect(screen.getByText('Utfall: 5/3/1')).toBeInTheDocument();
	});

	it('says "registered" instead of a score for an event not yet played', () => {
		render(PlayerTournamentList, {
			tournaments: [row({ isUpcoming: true, wins: 0, draws: 0, losses: 0, totalPoints: 0 })]
		});
		expect(screen.getByText('Anmäld')).toBeInTheDocument();
		expect(screen.queryByText(/Poäng:/)).toBeNull();
	});

	it('names the class only when the event has more than one', () => {
		render(PlayerTournamentList, { tournaments: [row({ hasMultipleClasses: true })] });
		expect(screen.getByText('Elit, Grupp A')).toBeInTheDocument();
	});

	it('shows the group alone when the class would add nothing', () => {
		render(PlayerTournamentList, { tournaments: [row()] });
		expect(screen.getByText('Grupp A')).toBeInTheDocument();
		expect(screen.queryByText(/Elit,/)).toBeNull();
	});
});

describe('dates', () => {
	it('says the shared year once', () => {
		render(PlayerTournamentList, { tournaments: [row()] });
		expect(screen.getByText('27 juni – 6 juli 2025')).toBeInTheDocument();
	});

	it('says a single-day event once, not as a range', () => {
		render(PlayerTournamentList, {
			tournaments: [row({ groupStartDate: '2025-06-27', groupEndDate: '2025-06-27' })]
		});
		expect(screen.getByText('27 juni 2025')).toBeInTheDocument();
	});

	it('shows the date it was given when it cannot be read', () => {
		render(PlayerTournamentList, {
			tournaments: [row({ groupStartDate: 'nonsense', groupEndDate: 'nonsense' })]
		});
		expect(screen.getByText('nonsense')).toBeInTheDocument();
	});
});

describe('the states with no rows', () => {
	it('says it is loading', () => {
		render(PlayerTournamentList, { tournaments: [], loading: true });
		expect(screen.getByText('Laddar turneringar...')).toBeInTheDocument();
	});

	it('says the data could not be fetched', () => {
		render(PlayerTournamentList, { tournaments: [], failed: true });
		expect(screen.getByText('Kunde inte hämta data')).toBeInTheDocument();
	});

	it('says there is no history', () => {
		render(PlayerTournamentList, { tournaments: [] });
		expect(screen.getByText('Ingen turneringshistorik hittades.')).toBeInTheDocument();
	});

	it('prefers loading over the empty message', () => {
		render(PlayerTournamentList, { tournaments: [], loading: true });
		expect(screen.queryByText('Ingen turneringshistorik hittades.')).toBeNull();
	});
});
