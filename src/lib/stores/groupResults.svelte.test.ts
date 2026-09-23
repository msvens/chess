import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TournamentDto } from '$lib/api';
import { GroupResultsState } from './groupResults.svelte';
import { playerCache } from './playerCache.svelte';
import { language } from './language.svelte';

// Real type numbers, from the SDK: 3 individual, 2 team-with-team-pairings,
// 9 Schackfyran (a team competition paired individually).
const INDIVIDUAL = 3;
const ALLSVENSKAN = 2;
const SCHACKFYRAN = 9;

const getTournament = vi.fn();
const getTournamentResults = vi.fn();
const getTournamentRoundResults = vi.fn();
const getTeamTournamentResults = vi.fn();
const getTeamRoundResults = vi.fn();

vi.mock('$lib/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api')>();
	return {
		...actual,
		TournamentService: class {
			getTournament = (...a: unknown[]) => getTournament(...a);
		},
		ResultsService: class {
			getTournamentResults = (...a: unknown[]) => getTournamentResults(...a);
			getTournamentRoundResults = (...a: unknown[]) => getTournamentRoundResults(...a);
			getTeamTournamentResults = (...a: unknown[]) => getTeamTournamentResults(...a);
			getTeamRoundResults = (...a: unknown[]) => getTeamRoundResults(...a);
		},
		PlayerService: class {
			getPlayerInfo = vi.fn().mockResolvedValue({ status: 404, data: undefined });
		}
	};
});

const make = () => new GroupResultsState();

function tournament(type: number, over: Partial<TournamentDto> = {}): TournamentDto {
	return {
		id: 5835,
		name: 'Test',
		type,
		state: 3,
		thinkingTime: '90+30',
		rootClasses: [
			{
				id: 1,
				name: 'Class',
				groups: [
					{
						id: 16642,
						name: 'Group A',
						start: '2026-08-01',
						end: '2026-08-03',
						rankingAlgorithm: 1,
						tournamentRounds: [
							{ roundNumber: 1, rated: 1 },
							{ roundNumber: 2, rated: 3 },
							{ roundNumber: 3, rated: 0 }
						]
					}
				]
			}
		],
		...over
	} as unknown as TournamentDto;
}

const ok = <T>(data: T) => ({ status: 200, data });

beforeEach(() => {
	playerCache._reset();
	for (const m of [
		getTournament,
		getTournamentResults,
		getTournamentRoundResults,
		getTeamTournamentResults,
		getTeamRoundResults
	])
		m.mockReset();
	getTournamentResults.mockResolvedValue(ok([]));
	getTournamentRoundResults.mockResolvedValue(ok([]));
	getTeamTournamentResults.mockResolvedValue(ok([]));
	getTeamRoundResults.mockResolvedValue(ok([]));
});

describe('load', () => {
	it('rejects non-numeric ids without calling the API', async () => {
		const state = make();
		await state.load(Number.NaN, 16642);
		expect(getTournament).not.toHaveBeenCalled();
		expect(state.error).toBeTruthy();
		expect(state.loading).toBe(false);
	});

	it('reads group metadata off the tournament', async () => {
		getTournament.mockResolvedValue(ok(tournament(INDIVIDUAL)));
		const state = make();
		await state.load(5835, 16642);

		expect(state.groupName).toBe('Group A');
		expect(state.groupStartDate).toBe('2026-08-01');
		expect(state.rankingAlgorithm).toBe(1);
		expect(state.thinkingTime).toBe('90+30');
		expect(state.roundsMap.size).toBe(3);
		expect(state.error).toBeNull();
	});

	it('surfaces a failed tournament fetch as an error, not an exception', async () => {
		getTournament.mockResolvedValue({ status: 500, data: undefined });
		const state = make();
		await state.load(5835, 16642);
		expect(state.error).toBeTruthy();
		expect(state.loading).toBe(false);
	});
});

describe('which endpoints get called', () => {
	it('uses the individual endpoints for an individual tournament', async () => {
		getTournament.mockResolvedValue(ok(tournament(INDIVIDUAL)));
		await make().load(5835, 16642);
		expect(getTournamentResults).toHaveBeenCalledWith(16642);
		expect(getTeamTournamentResults).not.toHaveBeenCalled();
	});

	it('uses the team endpoints for a team-paired tournament', async () => {
		getTournament.mockResolvedValue(ok(tournament(ALLSVENSKAN)));
		const state = make();
		await state.load(5835, 16642);
		expect(getTeamTournamentResults).toHaveBeenCalledWith(16642);
		expect(getTournamentResults).not.toHaveBeenCalled();
		expect(state.isTeamTournament).toBe(true);
	});

	// Schackfyran is a team competition whose pairings are individual. No
	// team-standings endpoint exists upstream, so asking would 502; the page shows
	// a notice instead.
	it('fetches nothing at all for an individually-paired team tournament', async () => {
		getTournament.mockResolvedValue(ok(tournament(SCHACKFYRAN)));
		const state = make();
		await state.load(5835, 16642);

		expect(getTeamTournamentResults).not.toHaveBeenCalled();
		expect(getTournamentResults).not.toHaveBeenCalled();
		expect(state.isIndividuallyPairedTeam).toBe(true);
		expect(state.isTeamTournament).toBe(true);
		expect(state.individualResults).toEqual([]);
		expect(state.teamResults).toEqual([]);
	});
});

describe('refresh', () => {
	// The API answers empty while it is mid-update. Blanking a live standings table
	// under the reader is the failure this prevents.
	it('keeps the previous round results when a refresh comes back empty', async () => {
		getTournament.mockResolvedValue(ok(tournament(INDIVIDUAL)));
		getTournamentRoundResults.mockResolvedValue(ok([{ round: 1 }]));
		const state = make();
		await state.load(5835, 16642);
		expect(state.individualRoundResults).toHaveLength(1);

		getTournamentRoundResults.mockResolvedValue(ok([]));
		await state.refresh();
		expect(state.individualRoundResults).toHaveLength(1);
	});

	it('takes new round results when a refresh returns some', async () => {
		getTournament.mockResolvedValue(ok(tournament(INDIVIDUAL)));
		getTournamentRoundResults.mockResolvedValue(ok([{ round: 1 }]));
		const state = make();
		await state.load(5835, 16642);

		getTournamentRoundResults.mockResolvedValue(ok([{ round: 1 }, { round: 2 }]));
		await state.refresh();
		expect(state.individualRoundResults).toHaveLength(2);
	});

	// On the FIRST load an empty answer is the truth — a tournament with no rounds
	// played yet — so it must not be mistaken for a mid-update blip.
	it('accepts an empty initial load', async () => {
		getTournament.mockResolvedValue(ok(tournament(INDIVIDUAL)));
		getTournamentRoundResults.mockResolvedValue(ok([]));
		const state = make();
		await state.load(5835, 16642);
		expect(state.individualRoundResults).toEqual([]);
	});

	it('does nothing before anything is loaded', async () => {
		await make().refresh();
		expect(getTournamentResults).not.toHaveBeenCalled();
	});
});

describe('staleness', () => {
	// Switching group while a fetch is in flight is ordinary here — the sidebars
	// invite it — so a slow earlier load must not overwrite a newer one.
	it('ignores an earlier load that finishes last', async () => {
		let releaseFirst: (v: unknown) => void = () => {};
		const first = new Promise((resolve) => (releaseFirst = resolve));

		getTournament
			.mockReturnValueOnce(first.then(() => ok(tournament(INDIVIDUAL, { name: 'STALE' }))))
			.mockResolvedValueOnce(ok(tournament(INDIVIDUAL, { name: 'FRESH' })));

		const state = make();
		const slow = state.load(5835, 16642);
		await state.load(5835, 16643);
		releaseFirst(null);
		await slow;

		expect(state.tournament?.name).toBe('FRESH');
	});
});

describe('player labels', () => {
	const state = () => {
		const s = make();
		return s;
	};

	it('names a walkover and a bye rather than showing an id', () => {
		const s = state();
		// Negative ids are the SDK's sentinels for these.
		expect(s.getPlayerName(-1)).toBeTruthy();
		expect(s.getPlayerName(-1)).not.toMatch(/-1/);
	});

	it('falls back to a translated placeholder for an unknown player', () => {
		// Swedish is the default, and the label really is translated — the React
		// version hardcoded `Player ${id}` in English.
		expect(state().getPlayerName(999999)).toBe('Okänd spelare');

		language.set('en');
		expect(state().getPlayerName(999999)).toBe('Unknown player');
		language.set('sv');
	});

	it('names a player from the group standings', async () => {
		getTournament.mockResolvedValue(ok(tournament(INDIVIDUAL)));
		getTournamentResults.mockResolvedValue(
			ok([{ playerInfo: { id: 42, firstName: 'Magnus', lastName: 'Carlsen' } }])
		);
		const s = make();
		await s.load(5835, 16642);
		expect(s.getPlayerName(42)).toContain('Carlsen');
	});
});

describe('per-round rating type', () => {
	// A tournament can mix rating types across rounds — a blitz chain inside a
	// standard event. A round's own `rated` wins over the group algorithm, except
	// when it is 0 (unrated), which falls back rather than showing nothing.
	it('knows each round rated type, and that 0 means unrated', async () => {
		getTournament.mockResolvedValue(ok(tournament(INDIVIDUAL)));
		const s = make();
		await s.load(5835, 16642);

		expect(s.getRoundRatedType(1)).toBe(1);
		expect(s.getRoundRatedType(2)).toBe(3);
		expect(s.getRoundRatedType(3)).toBe(0);
		expect(s.getRoundRatedType(99)).toBeUndefined();
	});
});

describe('the ranking rating as a number', () => {
	// `getPlayerRatingByDate` exists so callers that compute with a rating — the
	// team page averages its boards — do not have to parse the formatted string
	// back into a number, which is what the React version did ("1638 S" -> 1638).
	const load = async () => {
		getTournament.mockResolvedValue(ok(tournament(INDIVIDUAL)));
		getTournamentResults.mockResolvedValue(
			ok([
				{ playerInfo: { id: 42, firstName: 'A', lastName: 'B', elo: { rating: 1638 } } },
				{ playerInfo: { id: 43, firstName: 'C', lastName: 'D', elo: { rating: 0 } } }
			])
		);
		const s = make();
		await s.load(5835, 16642);
		return s;
	};

	it('gives the number for a rated player', async () => {
		const s = await load();
		expect(s.getPlayerRatingByDate(42, Date.now())).toBe(1638);
	});

	it('is null for an unknown player and for one with no rating of the ranked type', async () => {
		const s = await load();
		expect(s.getPlayerRatingByDate(999999, Date.now())).toBeNull();
		expect(s.getPlayerRatingByDate(43, Date.now())).toBeNull();
	});

	it('never disagrees with the string the same lookup formats', async () => {
		// Both go through one private helper precisely so they cannot drift; if
		// this ever fails, a rating is being displayed that is not the one being
		// averaged.
		const s = await load();
		const date = Date.now();
		for (const id of [42, 43, 999999]) {
			const rating = s.getPlayerRatingByDate(id, date);
			const shown = s.getPlayerEloByDate(id, date);
			if (rating === null) expect(shown).toBe('-');
			else expect(shown).toContain(String(rating));
		}
	});
});
