import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameDto, TournamentDto } from '$lib/api';
import { PLAYER_PROFILE_KEY, PlayerProfileState } from '$lib/stores/playerProfile.svelte';
import { tournamentCache } from '$lib/stores/tournamentCache.svelte';
import PlayerHistory from './PlayerHistory.svelte';

const INDIVIDUAL = 3;
const ALLSVENSKAN = 2;

const tournament = (id: number, groupId: number, name: string, type: number): TournamentDto =>
	({
		id,
		name,
		type,
		start: '2025-01-01',
		end: '2025-01-02',
		rootClasses: [
			{
				className: '',
				subClasses: [],
				groups: [{ id: groupId, name: 'A', start: '2025-01-01', end: '2025-01-02' }]
			}
		]
	}) as unknown as TournamentDto;

const game = (groupId: number): GameDto =>
	({ id: groupId, groupiD: groupId, whiteId: 500, blackId: 600, result: 1 }) as GameDto;

afterEach(() => tournamentCache._reset());

/**
 * A real store with its state set directly. The class holds no effects and does
 * no fetching until `load` is called, which is what makes this possible — and is
 * the reason the convention exists.
 */
function setup(prepare: (state: PlayerProfileState) => void = () => {}) {
	const state = new PlayerProfileState();
	state.memberId = 500;
	state.tournamentsLoading = false;
	prepare(state);

	render(PlayerHistory, {
		context: new Map([[PLAYER_PROFILE_KEY, state]])
	});
	return { state, user: userEvent.setup() };
}

/**
 * Seed the real derivation through its public seams rather than stubbing the
 * getters: the store builds its lists from `games` and the shared tournament
 * cache, and going through both is what proves the wiring.
 */
function withTournaments(state: PlayerProfileState, rows: [number, string, number][]) {
	for (const [groupId, name, type] of rows) {
		tournamentCache.add(groupId, tournament(groupId * 10, groupId, name, type));
	}
	state.games = rows.map(([groupId]) => game(groupId));
}

describe('the tab bar', () => {
	it('opens on the individual tab', () => {
		setup((state) => withTournaments(state, [[10, 'Rilton Cup', INDIVIDUAL]]));
		expect(screen.getByText('Rilton Cup')).toBeInTheDocument();
	});

	it('switches to the team tab', async () => {
		const { user } = setup((state) =>
			withTournaments(state, [
				[10, 'Rilton Cup', INDIVIDUAL],
				[20, 'Allsvenskan', ALLSVENSKAN]
			])
		);

		expect(screen.queryByText('Allsvenskan')).toBeNull();
		await user.click(screen.getByRole('button', { name: 'Lag' }));

		expect(screen.getByText('Allsvenskan')).toBeInTheDocument();
		expect(screen.queryByText('Rilton Cup')).toBeNull();
	});

	it('has no head-to-head tab until an opponent is chosen', () => {
		setup();
		expect(screen.getAllByRole('button').map((b) => b.textContent?.trim())).toEqual([
			'Individuell',
			'Lag',
			'Motståndare'
		]);
	});

	it('adds a tab named after the chosen opponent, and opens it', async () => {
		const { state } = setup();
		state.setSelectedOpponent(600, 'Anna Svensson');

		const tab = await screen.findByRole('button', { name: 'Anna Svensson' });
		expect(tab).toBeInTheDocument();
		// Selected: the individual tab's list is gone.
		expect(screen.queryByText('Ingen turneringshistorik hittades.')).toBeNull();
	});

	it('falls back to the individual tab when the opponent is cleared', async () => {
		const { state } = setup();
		state.setSelectedOpponent(600, 'Anna Svensson');
		await screen.findByRole('button', { name: 'Anna Svensson' });

		state.setSelectedOpponent(null);
		await vi.waitFor(() =>
			expect(screen.queryByRole('button', { name: 'Anna Svensson' })).toBeNull()
		);
		expect(screen.getByText('Ingen turneringshistorik hittades.')).toBeInTheDocument();
	});
});

describe('what the tabs are given', () => {
	it('passes the loading state through', () => {
		setup((state) => (state.tournamentsLoading = true));
		expect(screen.getByText('Laddar turneringar...')).toBeInTheDocument();
	});

	it('passes the failure through', () => {
		setup((state) => (state.gamesFailed = true));
		expect(screen.getByText('Kunde inte hämta data')).toBeInTheDocument();
	});
});
