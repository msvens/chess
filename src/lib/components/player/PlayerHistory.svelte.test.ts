import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameDto, TournamentDto } from '$lib/api';
import { PLAYER_PROFILE_KEY, PlayerProfileState } from '$lib/stores/playerProfile.svelte';
import { tournamentCache } from '$lib/stores/tournamentCache.svelte';
import PlayerHistory from './PlayerHistory.svelte';

const INDIVIDUAL = 3;
const ALLSVENSKAN = 2;

/** Round rating types, as SSF marks them: 1 standard, 2 rapid, 3 blitz. */
const STANDARD = [1, 1];
const BLITZ = [3, 3];
const MIXED = [2, 1];

const tournament = (
	id: number,
	groupId: number,
	name: string,
	type: number,
	rated: number[] = STANDARD
): TournamentDto =>
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
				groups: [
					{
						id: groupId,
						name: 'A',
						start: '2025-01-01',
						end: '2025-01-02',
						rankingAlgorithm: 1,
						tournamentRounds: rated.map((r, i) => ({ roundNumber: i + 1, rated: r }))
					}
				]
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
function withTournaments(state: PlayerProfileState, rows: [number, string, number, number[]?][]) {
	for (const [groupId, name, type, rated] of rows) {
		tournamentCache.add(groupId, tournament(groupId * 10, groupId, name, type, rated));
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

describe('the time-control filter on the tournament tabs', () => {
	const history = (state: PlayerProfileState) =>
		withTournaments(state, [
			[10, 'Rilton Cup', INDIVIDUAL, STANDARD],
			[11, 'Blixt-SM', INDIVIDUAL, BLITZ],
			[12, 'Rapid och lång', INDIVIDUAL, MIXED],
			[20, 'Allsvenskan', ALLSVENSKAN, STANDARD],
			[21, 'Lag-blixt', ALLSVENSKAN, BLITZ]
		]);

	const choose = async (user: ReturnType<typeof userEvent.setup>, option: string) => {
		await user.click(
			screen.getByRole('button', { name: /^Alla|^Normal|^Snabb|^Blixt|^Mixade|^Oratade/ })
		);
		await user.click(screen.getByRole('option', { name: option }));
	};

	it('narrows the list to the chosen kind, mixed included', async () => {
		const { user } = setup(history);
		await choose(user, 'Mixade (1)');

		expect(screen.getByText('Rapid och lång')).toBeInTheDocument();
		expect(screen.queryByText('Rilton Cup')).toBeNull();
		expect(screen.queryByText('Blixt-SM')).toBeNull();
	});

	it('goes back to all when the tab changes', async () => {
		const { user } = setup(history);
		await choose(user, 'Blixtschack (1)');
		await user.click(screen.getByRole('button', { name: 'Lag' }));

		expect(screen.getByRole('button', { name: 'Alla (2)' })).toBeInTheDocument();
		expect(screen.getByText('Allsvenskan')).toBeInTheDocument();
		expect(screen.getByText('Lag-blixt')).toBeInTheDocument();
	});

	it('says so when nothing is of the chosen kind, and keeps the filter', async () => {
		const { user } = setup(history);
		await choose(user, 'Snabbschack (0)');

		expect(screen.getByText('Inga turneringar med den här speltypen.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Snabbschack (0)' })).toBeInTheDocument();
	});

	it('is not offered for an empty history', () => {
		setup();
		expect(screen.queryByRole('button', { name: /^Alla/ })).toBeNull();
	});
});
