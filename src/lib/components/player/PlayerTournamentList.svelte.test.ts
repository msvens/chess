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
	it('links to the group it is for', () => {
		render(PlayerTournamentList, { tournaments: [row()] });
		expect(screen.getByRole('link', { name: /Rilton Cup/ })).toHaveAttribute(
			'href',
			'/results/6084/17040'
		);
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
		// Once for the mobile line and once for the desktop one.
		expect(screen.getAllByText('Elit, Grupp A').length).toBe(2);
	});

	it('shows the group alone when the class would add nothing', () => {
		render(PlayerTournamentList, { tournaments: [row()] });
		expect(screen.getAllByText('Grupp A').length).toBe(2);
		expect(screen.queryByText(/Elit,/)).toBeNull();
	});
});

describe('dates', () => {
	it('drops the leading zeros and says the year once, in the compact line', () => {
		render(PlayerTournamentList, { tournaments: [row()] });
		expect(screen.getByText('6-27 - 7-6 2025')).toBeInTheDocument();
	});

	it('spells both years out when a range crosses new year', () => {
		render(PlayerTournamentList, {
			tournaments: [row({ groupStartDate: '2025-12-27', groupEndDate: '2026-01-05' })]
		});
		expect(screen.getByText('2025-12-27 - 2026-1-5')).toBeInTheDocument();
	});

	it('says a single-day event once, not as a range', () => {
		render(PlayerTournamentList, {
			tournaments: [row({ groupStartDate: '2025-06-27', groupEndDate: '2025-06-27' })]
		});
		expect(screen.getByText('2025-6-27')).toBeInTheDocument();
	});

	it('reads the date as local, so it cannot slip a day', () => {
		// `new Date('2025-06-27')` is UTC midnight; read with local getters west of
		// Greenwich that is the 26th. `parseLocalDate` is the app's rule.
		render(PlayerTournamentList, {
			tournaments: [row({ groupStartDate: '2025-01-01', groupEndDate: '2025-01-01' })]
		});
		expect(screen.getByText('2025-1-1')).toBeInTheDocument();
	});

	it('shows the date it was given when it cannot be read', () => {
		render(PlayerTournamentList, {
			tournaments: [row({ groupStartDate: 'nonsense', groupEndDate: 'nonsense' })]
		});
		expect(screen.getAllByText('nonsense').length).toBeGreaterThan(0);
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
