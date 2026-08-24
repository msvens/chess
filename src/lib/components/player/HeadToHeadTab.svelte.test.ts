import { render, screen, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameDto, PlayerInfoDto, TournamentDto } from '$lib/api';
import { PLAYER_PROFILE_KEY, PlayerProfileState } from '$lib/stores/playerProfile.svelte';
import { tournamentCache } from '$lib/stores/tournamentCache.svelte';
import { playerCache } from '$lib/stores/playerCache.svelte';
import HeadToHeadTab from './HeadToHeadTab.svelte';

const getPlayerInfo = vi.fn();

// The cache is real; only the network under it is faked, so the historical
// lookups this tab makes are genuinely exercised.
vi.mock('$lib/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api')>();
	return {
		...actual,
		PlayerService: class {
			getPlayerInfo = (...a: unknown[]) => getPlayerInfo(...a);
		}
	};
});

const ME = 500;
const RIVAL = 600;
const RANKING = { standard: 1, blitz: 7 } as const;

const tournament = (groupId: number, name: string, ranking: number): TournamentDto =>
	({
		id: groupId * 10,
		name,
		type: 3,
		start: '2025-01-10',
		end: '2025-01-20',
		rootClasses: [
			{
				className: '',
				subClasses: [],
				groups: [
					{
						id: groupId,
						name: 'A',
						start: '2025-01-15',
						end: '2025-01-20',
						rankingAlgorithm: ranking
					}
				]
			}
		]
	}) as unknown as TournamentDto;

const game = (over: Partial<GameDto> = {}): GameDto =>
	({ id: 1, groupiD: 10, whiteId: ME, blackId: RIVAL, result: 1, ...over }) as GameDto;

const person = (id: number, first: string, last: string): PlayerInfoDto =>
	({
		id,
		firstName: first,
		lastName: last,
		birthdate: '1990',
		elo: { rating: 2000, k: 20 }
	}) as unknown as PlayerInfoDto;

beforeEach(() => {
	getPlayerInfo.mockReset();
	// Nobody is on record by default, so ratings stay unresolved.
	getPlayerInfo.mockResolvedValue({ status: 404, data: undefined });
});

afterEach(() => {
	tournamentCache._reset();
	playerCache._reset();
});

/** Both players rated on the standard and blitz lists. */
function withRatings() {
	getPlayerInfo.mockImplementation((id: number) =>
		Promise.resolve({
			status: 200,
			data: {
				id,
				firstName: id === ME ? 'Nils' : 'Anna',
				lastName: id === ME ? 'Grandelius' : 'Svensson',
				birthdate: '1990',
				elo: { rating: 2000, blitzRating: 1900, k: 20 }
			}
		})
	);
}

function setup(games: GameDto[], prepare: (state: PlayerProfileState) => void = () => {}) {
	tournamentCache.add(10, tournament(10, 'Rilton Cup', RANKING.standard));
	tournamentCache.add(20, tournament(20, 'Blixt-KM', RANKING.blitz));

	const state = new PlayerProfileState();
	state.memberId = ME;
	state.player = person(ME, 'Nils', 'Grandelius');
	state.gamesLoading = false;
	state.tournamentsLoading = false;
	state.games = games;
	prepare(state);

	render(HeadToHeadTab, {
		props: { opponentId: RIVAL },
		context: new Map([[PLAYER_PROFILE_KEY, state]])
	});
	return { state };
}

describe('which games appear', () => {
	it('shows only the games against this opponent', () => {
		setup([game({ id: 1, groupiD: 10 }), game({ id: 2, groupiD: 20, blackId: 777 })]);
		expect(screen.getByText('Rilton Cup')).toBeInTheDocument();
		expect(screen.queryByText('Blixt-KM')).toBeNull();
	});

	it('finds them whichever colour the player had', () => {
		setup([game({ id: 1, groupiD: 10, whiteId: RIVAL, blackId: ME, result: -1 })]);
		expect(screen.getByText('Rilton Cup')).toBeInTheDocument();
	});

	it('says so when they have never met', () => {
		setup([game({ id: 1, blackId: 777 })]);
		expect(screen.getByText('Inga partier hittades')).toBeInTheDocument();
	});

	it('says it is loading while the games are still coming', () => {
		setup([], (state) => (state.gamesLoading = true));
		expect(screen.getByText('Laddar partier...')).toBeInTheDocument();
	});
});

/** The panel below the table — several of its labels also appear as column headers. */
function panel(): HTMLElement {
	const total = screen.getByText('Totalt').closest('div.p-3');
	if (!(total instanceof HTMLElement)) throw new Error('no summary panel');
	return total;
}

describe('the summary panel', () => {
	it('counts the score as 1/½/0 out of the games played', () => {
		setup([
			game({ id: 1, groupiD: 10, result: 1 }),
			game({ id: 2, groupiD: 10, result: 0 }),
			game({ id: 3, groupiD: 10, result: -1 })
		]);
		expect(screen.getByText('1.5 av 3')).toBeInTheDocument();
	});

	it('leaves walkovers out of the count', () => {
		setup([game({ id: 1, groupiD: 10, result: 1 }), game({ id: 2, groupiD: 10, result: 2 })]);
		expect(screen.getByText('1 av 1')).toBeInTheDocument();
	});

	it('shows a dash rather than a blank when nothing was rated', () => {
		// Neither player is in the cache, so no rating can be found — the panel
		// still needs an Elo line under the total, or it reads as broken.
		setup([game({ id: 1, groupiD: 10 })]);
		const summary = panel();
		expect(within(summary).getByText('Elo +/-')).toBeInTheDocument();
		expect(within(summary).getByText('Elo prestation')).toBeInTheDocument();
		expect(within(summary).getAllByText('-')).toHaveLength(2);
	});

	it('keeps standard and blitz on separate lines — different rating lists', async () => {
		// Elo from two different lists must never be added together, so a player
		// with both gets a row each.
		withRatings();
		setup([game({ id: 1, groupiD: 10 }), game({ id: 2, groupiD: 20 })]);

		await vi.waitFor(() => expect(within(panel()).getByText('Blixt Elo +/-')).toBeInTheDocument());
		expect(within(panel()).getByText('Elo +/-')).toBeInTheDocument();
		expect(within(panel()).getByText('Blixt prestation')).toBeInTheDocument();
	});

	it('signs the Elo change, and totals it per list', async () => {
		withRatings();
		setup([game({ id: 1, groupiD: 10, result: 1 })]);

		// A win against an equal on a K of 20 is +10.
		await vi.waitFor(() => expect(within(panel()).getByText('+10')).toBeInTheDocument());
	});

	it('has no panel at all when nothing countable was played', () => {
		setup([game({ id: 1, groupiD: 10, result: -100 })]);
		expect(screen.queryByText(/av /)).toBeNull();
	});
});

describe('the table', () => {
	it('links the opponent to their own profile, and leaves the player plain', () => {
		setup([game({ id: 1, groupiD: 10 })]);
		expect(screen.getByText('Nils Grandelius').tagName).toBe('SPAN');
		expect(screen.getByRole('link', { name: /Hämtar \(600\)/ })).toHaveAttribute(
			'href',
			'/players/600'
		);
	});

	it('links each game to its group', () => {
		setup([game({ id: 1, groupiD: 10 })]);
		expect(screen.getByRole('link', { name: 'Rilton Cup' })).toHaveAttribute(
			'href',
			'/results/100/10'
		);
	});

	it('shows a dash for an Elo it cannot resolve', () => {
		setup([game({ id: 1, groupiD: 10 })]);
		// Two Elo columns, both unresolvable without a cached record.
		expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2);
	});

	it('shows the rating each player brought to that game', async () => {
		withRatings();
		setup([game({ id: 1, groupiD: 10 })]);
		// The group is standard-ranked, so both sides show their standard rating.
		await vi.waitFor(() => expect(screen.getAllByText('2000').length).toBe(2));
	});

	it('reads the blitz list for a blitz-ranked group, and says which list', async () => {
		// The SDK suffixes a non-standard rating so the column is not ambiguous:
		// " B" for blitz, " S"/" R" for rapid depending on the language.
		withRatings();
		setup([game({ id: 1, groupiD: 20 })]);
		await vi.waitFor(() => expect(screen.getAllByText('1900 B').length).toBe(2));
	});
});
