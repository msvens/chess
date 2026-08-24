import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameDto, PlayerInfoDto, TournamentDto } from '$lib/api';
import { PlayerProfileState } from './playerProfile.svelte';
import { playerCache } from './playerCache.svelte';
import { tournamentCache } from './tournamentCache.svelte';

const ME = 348805;
const INDIVIDUAL = 3;
const ALLSVENSKAN = 2;

const getMemberGames = vi.fn();
const getMemberTournamentResults = vi.fn();
const getPlayerInfo = vi.fn();
const getTournamentFromGroupBatch = vi.fn();

// The caches are exercised for real — they are the interesting half. Only the
// network under them is faked.
vi.mock('$lib/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api')>();
	return {
		...actual,
		ResultsService: class {
			getMemberGames = (...a: unknown[]) => getMemberGames(...a);
			getMemberTournamentResults = (...a: unknown[]) => getMemberTournamentResults(...a);
		},
		PlayerService: class {
			getPlayerInfo = (...a: unknown[]) => getPlayerInfo(...a);
		},
		TournamentService: class {
			getTournamentFromGroupBatch = (...a: unknown[]) => getTournamentFromGroupBatch(...a);
		}
	};
});

const player = (id: number, firstName = 'Nils', lastName = 'Grandelius'): PlayerInfoDto =>
	({ id, firstName, lastName }) as PlayerInfoDto;

const game = (over: Partial<GameDto> = {}): GameDto =>
	({ id: 1, groupiD: 10, whiteId: ME, blackId: 600, result: 1, ...over }) as GameDto;

const tournament = (id: number, groupId: number, type = INDIVIDUAL): TournamentDto =>
	({
		id,
		name: `Tournament ${id}`,
		type,
		start: '2025-01-01',
		end: '2025-01-05',
		rootClasses: [
			{
				className: 'Open',
				subClasses: [],
				groups: [{ id: groupId, name: 'A', start: '2025-01-01', end: '2025-01-05' }]
			}
		]
	}) as unknown as TournamentDto;

/** The happy path, so each test overrides only what it is about. */
function stubAll() {
	getPlayerInfo.mockImplementation((id: number) =>
		Promise.resolve({ status: 200, data: player(id) })
	);
	getMemberGames.mockResolvedValue({ status: 200, data: [game()] });
	getMemberTournamentResults.mockResolvedValue({ status: 200, data: [] });
	getTournamentFromGroupBatch.mockImplementation((ids: number[]) =>
		Promise.resolve(ids.map((id) => ({ status: 200, data: tournament(id * 100, id) })))
	);
}

describe('loading a profile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		playerCache._reset();
		tournamentCache._reset();
		stubAll();
	});

	it('has the player before the games arrive', async () => {
		// The header should not wait on an 80 KB payload of PGN.
		let gamesResolve: (value: unknown) => void = () => {};
		getMemberGames.mockReturnValue(new Promise((resolve) => (gamesResolve = resolve)));

		const state = new PlayerProfileState();
		const loading = state.load(ME);
		await vi.waitFor(() => expect(state.playerLoading).toBe(false));

		expect(state.player?.id).toBe(ME);
		expect(state.gamesLoading).toBe(true);

		gamesResolve({ status: 200, data: [] });
		await loading;
	});

	it('builds the tournament history from the games', async () => {
		const state = new PlayerProfileState();
		await state.load(ME);

		expect(state.tournaments).toHaveLength(1);
		expect(state.tournaments[0]).toMatchObject({ groupId: 10, gameCount: 1, wins: 1 });
		expect(state.tournamentsLoading).toBe(false);
	});

	it('splits individual from team events', async () => {
		getMemberGames.mockResolvedValue({
			status: 200,
			data: [game({ groupiD: 10 }), game({ id: 2, groupiD: 20 })]
		});
		getTournamentFromGroupBatch.mockImplementation((ids: number[]) =>
			Promise.resolve(
				ids.map((id) => ({
					status: 200,
					data: tournament(id * 100, id, id === 20 ? ALLSVENSKAN : INDIVIDUAL)
				}))
			)
		);

		const state = new PlayerProfileState();
		await state.load(ME);

		expect(state.individualTournaments.map((t) => t.groupId)).toEqual([10]);
		expect(state.teamTournaments.map((t) => t.groupId)).toEqual([20]);
	});

	it('adds events entered but not played', async () => {
		getMemberTournamentResults.mockResolvedValue({
			status: 200,
			// 10 has games already; only 30 is upcoming.
			data: [{ groupId: 10 }, { groupId: 30 }]
		});

		const state = new PlayerProfileState();
		await state.load(ME);

		expect(state.upcomingGroupIds).toEqual([30]);
		expect(state.tournaments.map((t) => t.groupId).sort()).toEqual([10, 30]);
	});

	it('fetches every opponent, and no bye or walkover slot', async () => {
		// schack.se answers a negative id with a 502.
		getMemberGames.mockResolvedValue({
			status: 200,
			data: [game({ blackId: 600 }), game({ id: 2, blackId: -1 }), game({ id: 3, blackId: -100 })]
		});

		const state = new PlayerProfileState();
		await state.load(ME);

		const asked = getPlayerInfo.mock.calls.map((call) => call[0]);
		expect(asked).toContain(600);
		expect(asked.some((id: number) => id < 0)).toBe(false);
	});

	it('offers the SDK real maps, keyed by what the games reference', async () => {
		const state = new PlayerProfileState();
		await state.load(ME);

		expect(state.tournamentMap.get(10)?.name).toBe('Tournament 1000');
		expect(state.playerMap.get(600)?.id).toBe(600);
		expect(state.playerMap.get(ME)?.id).toBe(ME);
	});

	it('names the player with their FIDE title', async () => {
		getPlayerInfo.mockResolvedValue({
			status: 200,
			data: { id: ME, firstName: 'Nils', lastName: 'Grandelius', elo: { title: 'GM' } }
		});

		const state = new PlayerProfileState();
		await state.load(ME);
		expect(state.currentPlayerName).toContain('Grandelius');
		expect(state.currentPlayerName).toContain('GM');
	});
});

describe('when things go wrong', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		playerCache._reset();
		tournamentCache._reset();
		stubAll();
	});

	it('clears every loading flag for an id that is not a number', async () => {
		// The React version cleared only `gamesLoading` here, so `/players/abc`
		// showed "Loading player information..." forever instead of "not found".
		const state = new PlayerProfileState();
		await state.load(Number.NaN);

		expect(state.invalidId).toBe(true);
		expect(state.playerLoading).toBe(false);
		expect(state.gamesLoading).toBe(false);
		expect(state.tournamentsLoading).toBe(false);
		expect(getMemberGames).not.toHaveBeenCalled();
	});

	it('leaves the player null when there is no such player', async () => {
		getPlayerInfo.mockResolvedValue({ status: 404, data: undefined });

		const state = new PlayerProfileState();
		await state.load(ME);

		expect(state.player).toBeNull();
		expect(state.playerLoading).toBe(false);
		expect(state.invalidId).toBe(false);
	});

	it('keeps the rest of the page when the games call fails', async () => {
		// schack.se can NPE aggregating team results; the header and the chart
		// still work.
		getMemberGames.mockResolvedValue({ status: 500 });

		const state = new PlayerProfileState();
		await state.load(ME);

		expect(state.gamesFailed).toBe(true);
		expect(state.games).toEqual([]);
		expect(state.player?.id).toBe(ME);
		expect(state.gamesLoading).toBe(false);
		expect(state.tournamentsLoading).toBe(false);
	});

	it('re-arms every flag on the next load', async () => {
		const state = new PlayerProfileState();
		await state.load(ME);
		expect(state.gamesFailed).toBe(false);

		let release: (value: unknown) => void = () => {};
		getMemberGames.mockReturnValue(new Promise((resolve) => (release = resolve)));

		const second = state.load(600);
		await vi.waitFor(() => expect(state.memberId).toBe(600));
		// The React version never re-armed this, so player B showed player A's
		// tournaments as final while B's were still loading.
		expect(state.tournamentsLoading).toBe(true);
		expect(state.tournaments).toEqual([]);

		release({ status: 200, data: [] });
		await second;
	});

	it('lets the newest load win when two overlap', async () => {
		// Keyed on the id rather than on call order, so which load is held back is
		// not a race.
		let releaseFirst: (value: unknown) => void = () => {};
		getMemberGames.mockImplementation((id: number) =>
			id === ME
				? new Promise((resolve) => (releaseFirst = resolve))
				: Promise.resolve({ status: 200, data: [] })
		);

		const state = new PlayerProfileState();
		const first = state.load(ME);
		const second = state.load(600);
		await second;

		// The abandoned load now resolves, late, and must change nothing.
		releaseFirst({ status: 200, data: [game({ groupiD: 999 })] });
		await first;

		expect(state.memberId).toBe(600);
		expect(state.games.some((g) => g.groupiD === 999)).toBe(false);
	});
});

describe('the selected opponent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		playerCache._reset();
		tournamentCache._reset();
		stubAll();
	});

	it('is remembered with their name', () => {
		const state = new PlayerProfileState();
		state.setSelectedOpponent(600, 'Anna Svensson');
		expect(state.selectedOpponentId).toBe(600);
		expect(state.selectedOpponentName).toBe('Anna Svensson');
	});

	it('is cleared when the profile changes', async () => {
		const state = new PlayerProfileState();
		state.setSelectedOpponent(600, 'Anna Svensson');
		await state.load(ME);
		expect(state.selectedOpponentId).toBeNull();
		expect(state.selectedOpponentName).toBeNull();
	});
});
