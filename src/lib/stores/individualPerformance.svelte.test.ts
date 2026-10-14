import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	getIndividualPerformance,
	PointSystem,
	ResultCode,
	RoundRatedType,
	type PlayerInfoDto,
	type TournamentDto,
	type TournamentRoundResultDto
} from '$lib/api';
import type { PrintData, PrintGroupData } from '$lib/print/printData';
import { IndividualPerformanceState } from './individualPerformance.svelte';
import { playerCache } from './playerCache.svelte';
import { batchOver } from '../../test-utils/playerBatch';

const loadPrintData = vi.fn();
const getPlayerInfo = vi.fn();

vi.mock('$lib/print/printData', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/print/printData')>()),
	loadPrintData: (...a: unknown[]) => loadPrintData(...a)
}));

vi.mock('$lib/api', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api')>()),
	PlayerService: class {
		getPlayerInfo = (...a: unknown[]) => getPlayerInfo(...a);
		getPlayerInfoBatch = batchOver((id, date) => getPlayerInfo(id, date));
	}
}));

const GROUP = 10;
const INDIVIDUAL = 3;

const tournament = (type = INDIVIDUAL): TournamentDto =>
	({
		id: 1,
		type,
		rootClasses: [
			{
				classID: 1,
				groups: [
					{
						id: GROUP,
						pointSystem: PointSystem.DEFAULT,
						rankingAlgorithm: 1,
						tournamentRounds: [1, 2, 3].map((roundNumber) => ({
							roundNumber,
							rated: RoundRatedType.STANDARD
						}))
					}
				]
			}
		]
	}) as unknown as TournamentDto;

/** Player 1 beats opponents `opponents`, one round each, on `date`. */
const rows = (opponents: number[], date: string): TournamentRoundResultDto[] =>
	opponents.map(
		(blackId, i) =>
			({
				roundNr: i + 1,
				date,
				homeId: 1,
				awayId: blackId,
				games: [{ whiteId: 1, blackId, result: ResultCode.WHITE_WIN }]
			}) as unknown as TournamentRoundResultDto
	);

const player = (id: number, rating: number, listDate = '2026-10-01'): PlayerInfoDto =>
	({ id, firstName: 'A', lastName: `P${id}`, elo: { rating, date: listDate } }) as PlayerInfoDto;

const printData = (
	roundResults: TournamentRoundResultDto[],
	players: PlayerInfoDto[],
	type = INDIVIDUAL
): PrintData =>
	({
		tournament: tournament(type),
		groups: [
			{
				group: tournament(type).rootClasses![0].groups![0],
				kind: type === INDIVIDUAL ? 'individual' : 'team',
				roundResults,
				playerMap: new Map(players.map((p) => [p.id, p]))
			} as unknown as PrintGroupData
		]
	}) as PrintData;

beforeEach(() => {
	playerCache._reset();
	loadPrintData.mockReset();
	getPlayerInfo.mockReset();
	getPlayerInfo.mockResolvedValue({ status: 204 });
});

describe('IndividualPerformanceState', () => {
	it('asks for no ratings when the results table is the round’s own list', async () => {
		const players = [player(1, 1500), player(2, 1600), player(3, 1700), player(4, 1800)];
		const data = printData(rows([2, 3, 4], '2026-10-05'), players);
		loadPrintData.mockResolvedValue(data);

		const state = new IndividualPerformanceState();
		await state.load(1);

		expect(getPlayerInfo).not.toHaveBeenCalled();
		const expected = getIndividualPerformance(
			data.tournament,
			new Map([[GROUP, data.groups[0].roundResults]]),
			(id) => players.find((p) => p.id === id)
		);
		expect(state.rows).toEqual(expected);
		expect(state.rows.find((r) => r.playerId === 1)?.performance).not.toBeNull();
	});

	it('fetches the ratings of an earlier month in one batch, and uses them', async () => {
		// The results table is from October; the rounds were played in September.
		const opponents = Array.from({ length: 13 }, (_, i) => 100 + i);
		const players = [player(1, 1500), ...opponents.map((id) => player(id, 1000))];
		loadPrintData.mockResolvedValue(printData(rows(opponents, '2026-09-10'), players));
		getPlayerInfo.mockImplementation(async (id: number) => ({
			status: 200,
			data: player(id, 2000, '2026-09-01')
		}));
		const fetches = vi.spyOn(playerCache, 'fetchManyByDate');

		const state = new IndividualPerformanceState();
		await state.load(1);

		// One call: splitting it up is the SDK's job now.
		expect(fetches).toHaveBeenCalledTimes(1);
		// Player 1 beat every opponent at their September rating of 2000.
		expect(state.rows.find((r) => r.playerId === 1)?.performance).toBe(2800);
		fetches.mockRestore();
	});

	it('falls back to the results table when a dated rating cannot be had', async () => {
		// School-only players answer 204 for a dated lookup.
		const players = [player(1, 1500), player(2, 1600), player(3, 1600), player(4, 1600)];
		loadPrintData.mockResolvedValue(printData(rows([2, 3, 4], '2026-09-10'), players));

		const state = new IndividualPerformanceState();
		await state.load(1);

		expect(getPlayerInfo).toHaveBeenCalled();
		expect(state.rows.find((r) => r.playerId === 1)?.performance).toBe(2400);
	});

	it('offers no list for a team tournament', async () => {
		loadPrintData.mockResolvedValue(printData([], [], 2));

		const state = new IndividualPerformanceState();
		await state.load(1);

		expect(state.available).toBe(false);
		expect(state.rows).toEqual([]);
	});

	it('marks a tournament that cannot be loaded', async () => {
		loadPrintData.mockRejectedValue(new Error('Failed to load tournament'));

		const state = new IndividualPerformanceState();
		await state.load(1);

		expect(state.failed).toBe(true);
		expect(state.loading).toBe(false);
	});

	it('lets a newer load win over one still in flight', async () => {
		let resolveSlow: (data: PrintData) => void = () => {};
		loadPrintData.mockReturnValueOnce(new Promise((resolve) => (resolveSlow = resolve)));
		const fast = printData(rows([2, 3, 4], '2026-10-05'), [player(1, 1500), player(2, 1600)]);
		loadPrintData.mockResolvedValueOnce(fast);

		const state = new IndividualPerformanceState();
		const slow = state.load(1);
		await state.load(2);
		resolveSlow(printData([], [], 2));
		await slow;

		expect(state.tournament).toBe(fast.tournament);
		expect(state.available).toBe(true);
	});
});
