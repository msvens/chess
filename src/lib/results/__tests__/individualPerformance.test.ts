import { describe, expect, it } from 'vitest';
import {
	PointSystem,
	ResultCode,
	RoundRatedType,
	type PlayerInfoDto,
	type TournamentDto,
	type TournamentRoundResultDto
} from '$lib/api';
import type { PrintGroupData } from '$lib/print/printData';
import { namesToFetch, performanceInputs, ratingsToFetch } from '../individualPerformance';

// A real tournament type: 3 individual.
const INDIVIDUAL = 3;

const group = (id: number, pointSystem: number = PointSystem.DEFAULT) => ({
	id,
	name: `Group ${id}`,
	pointSystem,
	rankingAlgorithm: 1,
	tournamentRounds: [{ roundNumber: 1, rated: RoundRatedType.STANDARD as number }]
});

const tournament = (type: number, groups = [group(10)]): TournamentDto =>
	({ id: 1, type, rootClasses: [{ classID: 1, groups }] }) as unknown as TournamentDto;

const row = (whiteId: number, blackId: number, date: string): TournamentRoundResultDto =>
	({
		roundNr: 1,
		date,
		homeId: whiteId,
		awayId: blackId,
		games: [{ whiteId, blackId, result: ResultCode.WHITE_WIN }]
	}) as unknown as TournamentRoundResultDto;

const player = (id: number, listDate: string): PlayerInfoDto =>
	({
		id,
		firstName: 'A',
		lastName: `P${id}`,
		elo: { rating: 1500, date: listDate }
	}) as PlayerInfoDto;

const printGroup = (
	id: number,
	rounds: TournamentRoundResultDto[],
	players: PlayerInfoDto[],
	kind: PrintGroupData['kind'] = 'individual',
	teamStandings: { contenderId: number; club?: { name: string }; team?: { name: string } }[] = []
): PrintGroupData =>
	({
		group: group(id),
		kind,
		roundResults: rounds,
		playerMap: new Map(players.map((p) => [p.id, p])),
		teamStandings
	}) as unknown as PrintGroupData;

/**
 * One team match: club 100 at home against club 200, with `boards` as
 * `[tableNr, whiteId, blackId]`. Board colours alternate; on an odd `tableNr`
 * the home team has white.
 */
const teamRow = (
	boards: [number, number, number][],
	date = '2026-10-05'
): TournamentRoundResultDto =>
	({
		roundNr: 1,
		date,
		homeId: 100,
		awayId: 200,
		games: boards.map(([tableNr, whiteId, blackId]) => ({
			tableNr,
			whiteId,
			blackId,
			result: ResultCode.WHITE_WIN
		}))
	}) as unknown as TournamentRoundResultDto;

const standings = [
	{ contenderId: 100, club: { name: 'Växjö SK' } },
	{ contenderId: 200, club: { name: 'Kalmar SK' } }
];

describe('performanceInputs', () => {
	it('merges every individual group’s players and keeps each group’s rounds', () => {
		const inputs = performanceInputs([
			printGroup(10, [row(1, 2, '2026-10-05')], [player(1, '2026-10-01')]),
			printGroup(11, [row(3, 4, '2026-10-05')], [player(3, '2026-10-01')])
		]);
		expect([...inputs.roundResults.keys()]).toEqual([10, 11]);
		expect([...inputs.snapshot.keys()]).toEqual([1, 3]);
	});

	it('includes team groups, whose tables carry no players', () => {
		const inputs = performanceInputs([
			printGroup(10, [teamRow([[0, 1, 2]])], [], 'team', standings)
		]);
		expect([...inputs.roundResults.keys()]).toEqual([10]);
		expect(inputs.snapshot.size).toBe(0);
	});

	it('gives a team player the club of the team they sat for, by board colour', () => {
		// Board 0: away has white (player 1 is away); board 1: home has white (player 3 is home).
		const inputs = performanceInputs([
			printGroup(
				10,
				[
					teamRow([
						[0, 1, 2],
						[1, 3, 4]
					])
				],
				[],
				'team',
				standings
			)
		]);
		expect(Object.fromEntries(inputs.teamClub)).toEqual({
			1: 'Kalmar SK',
			2: 'Växjö SK',
			3: 'Växjö SK',
			4: 'Kalmar SK'
		});
	});

	it('names a loosely coupled team (a school) by its team', () => {
		const school = [{ contenderId: 100, team: { name: 'Bilingual Montessori School' } }];
		const inputs = performanceInputs([printGroup(10, [teamRow([[1, 3, 4]])], [], 'team', school)]);
		expect(inputs.teamClub.get(3)).toBe('Bilingual Montessori School');
	});
});

describe('namesToFetch', () => {
	it('asks for every player no results table covers, at their first game', () => {
		const inputs = performanceInputs([
			printGroup(
				10,
				[teamRow([[1, 3, 4]], '2026-11-02'), teamRow([[0, 3, 5]], '2026-10-05')],
				[],
				'team',
				standings
			)
		]);
		expect(namesToFetch(inputs)).toEqual([
			{ playerId: 3, roundDate: '2026-10-05' },
			{ playerId: 4, roundDate: '2026-11-02' },
			{ playerId: 5, roundDate: '2026-10-05' }
		]);
	});

	it('asks for nobody a results table already has', () => {
		const inputs = performanceInputs([
			printGroup(10, [row(1, 2, '2026-10-05')], [player(1, '2026-10-01'), player(2, '2026-10-01')])
		]);
		expect(namesToFetch(inputs)).toEqual([]);
	});
});

describe('ratingsToFetch', () => {
	const t = tournament(INDIVIDUAL);

	it('fetches nothing when the results table is the round’s own rating list', () => {
		// The common case: a single-month event.
		const inputs = performanceInputs([
			printGroup(10, [row(1, 2, '2026-10-05')], [player(1, '2026-10-01'), player(2, '2026-10-01')])
		]);
		expect(ratingsToFetch(t, inputs)).toEqual([]);
	});

	it('fetches a round played in a month the results table is not from', () => {
		const inputs = performanceInputs([
			printGroup(10, [row(1, 2, '2026-09-20')], [player(1, '2026-10-01'), player(2, '2026-10-01')])
		]);
		expect(ratingsToFetch(t, inputs)).toEqual([
			{ playerId: 2, roundDate: '2026-09-20' },
			{ playerId: 1, roundDate: '2026-09-20' }
		]);
	});

	it('fetches a player the results table does not have', () => {
		const inputs = performanceInputs([
			printGroup(10, [row(1, 2, '2026-10-05')], [player(1, '2026-10-01')])
		]);
		expect(ratingsToFetch(t, inputs)).toEqual([{ playerId: 2, roundDate: '2026-10-05' }]);
	});
});
