import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { GameDto, PlayerInfoDto, TournamentDto } from '$lib/api';
import { PLAYER_PROFILE_KEY, PlayerProfileState } from '$lib/stores/playerProfile.svelte';
import { tournamentCache } from '$lib/stores/tournamentCache.svelte';
import { playerCache } from '$lib/stores/playerCache.svelte';
import OpponentsTab from './OpponentsTab.svelte';

const ME = 500;

/**
 * `rankingAlgorithm` decides a group's time control. Real SDK codes — note that
 * 3 is LASK, not blitz, and `getGroupRatingType` reports LASK groups as standard.
 */
const RANKING = { standard: 1, rapid: 6, blitz: 7 } as const;

const tournament = (groupId: number, name: string, ranking: number): TournamentDto =>
	({
		id: groupId * 10,
		name,
		type: 3,
		start: '2025-01-01',
		end: '2025-01-02',
		rootClasses: [
			{
				className: '',
				subClasses: [],
				groups: [
					{
						id: groupId,
						name: 'A',
						start: '2025-01-01',
						end: '2025-01-02',
						rankingAlgorithm: ranking
					}
				]
			}
		]
	}) as unknown as TournamentDto;

const game = (id: number, groupId: number, opponentId = 600, result = 1): GameDto =>
	({ id, groupiD: groupId, whiteId: ME, blackId: opponentId, result }) as GameDto;

afterEach(() => {
	tournamentCache._reset();
	playerCache._reset();
});

function setup(prepare: (state: PlayerProfileState) => void = () => {}) {
	const state = new PlayerProfileState();
	state.memberId = ME;
	state.player = { id: ME, firstName: 'Nils', lastName: 'Grandelius' } as PlayerInfoDto;
	state.gamesLoading = false;
	state.tournamentsLoading = false;
	prepare(state);

	render(OpponentsTab, { context: new Map([[PLAYER_PROFILE_KEY, state]]) });
	return { state, user: userEvent.setup() };
}

/** A standard group and a blitz group, one game each. */
function twoGroups(state: PlayerProfileState) {
	tournamentCache.add(10, tournament(10, 'Rilton Cup', RANKING.standard));
	tournamentCache.add(20, tournament(20, 'Blixt-KM', RANKING.blitz));
	state.games = [game(1, 10), game(2, 20)];
}

describe('the states with nothing to show', () => {
	it('says it is loading', () => {
		setup((state) => (state.gamesLoading = true));
		expect(screen.getByText('Laddar motståndarstatistik...')).toBeInTheDocument();
	});

	it('says the games could not be fetched', () => {
		// schack.se can NPE aggregating team results; this tab needs games.
		setup((state) => (state.gamesFailed = true));
		expect(screen.getByText('Kunde inte hämta data')).toBeInTheDocument();
	});

	it('says there are no opponents when the player has never played', () => {
		setup();
		expect(screen.getByText('Inga motståndare funna')).toBeInTheDocument();
	});
});

describe('the time-control counts', () => {
	it('counts each group under its own rating type', async () => {
		const { user } = setup(twoGroups);
		await user.click(screen.getByRole('button', { expanded: false }));

		expect(screen.getAllByRole('option').map((o) => o.textContent?.trim())).toEqual([
			'Alla (2)',
			'Normal (1)',
			'Snabbschack (0)',
			'Blixtschack (1)',
			'Oratade (0)'
		]);
	});

	it('narrows the table to the chosen control', async () => {
		const { user } = setup(twoGroups);
		expect(screen.getByText('Rilton Cup')).toBeInTheDocument();
		expect(screen.getByText('Blixt-KM')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { expanded: false }));
		await user.click(screen.getByRole('option', { name: 'Blixtschack (1)' }));

		expect(screen.getByText('Blixt-KM')).toBeInTheDocument();
		expect(screen.queryByText('Rilton Cup')).toBeNull();
	});
});

describe('the games table', () => {
	it('says "retrieving" while an opponent is still unknown', () => {
		// Not "unknown" — the difference between "we have not asked yet" and
		// "the API confirmed there is no record". The id is kept alongside so an
		// unresolved row is still identifiable.
		setup(twoGroups);
		expect(screen.getAllByText('Hämtar (600)').length).toBe(2);
	});

	it('shows the player under their own name on their own side', () => {
		setup(twoGroups);
		expect(screen.getAllByText('Nils Grandelius').length).toBe(2);
	});

	it('opens the head-to-head tab when an opponent is clicked', async () => {
		const { state, user } = setup(twoGroups);
		await user.click(screen.getAllByRole('button', { name: 'Hämtar (600)' })[0]);
		expect(state.selectedOpponentId).toBe(600);
	});

	it('does not make the player themselves clickable', () => {
		setup(twoGroups);
		expect(screen.queryByRole('button', { name: 'Nils Grandelius' })).toBeNull();
	});

	it('links each game to its group', () => {
		setup(twoGroups);
		expect(screen.getByRole('link', { name: 'Rilton Cup' })).toHaveAttribute(
			'href',
			'/results/100/10'
		);
	});
});
