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
import {
	hasIndividualPerformance,
	performanceInputs,
	ratingsToFetch
} from '../individualPerformance';

// Real tournament types: 3 individual, 2 team-with-team-pairings.
const INDIVIDUAL = 3;
const TEAM = 2;

const group = (id: number, pointSystem: number = PointSystem.DEFAULT) => ({
	id,
	name: `Group ${id}`,
	pointSystem,
	rankingAlgorithm: 1,
	tournamentRounds: [{ roundNumber: 1, rated: RoundRatedType.STANDARD }]
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
	kind: PrintGroupData['kind'] = 'individual'
): PrintGroupData =>
	({
		group: group(id),
		kind,
		roundResults: rounds,
		playerMap: new Map(players.map((p) => [p.id, p]))
	}) as unknown as PrintGroupData;

describe('hasIndividualPerformance', () => {
	it('is offered for an individual tournament', () => {
		expect(hasIndividualPerformance(tournament(INDIVIDUAL))).toBe(true);
	});

	it('is not offered for a team tournament (not yet)', () => {
		expect(hasIndividualPerformance(tournament(TEAM))).toBe(false);
	});

	it('is not offered when every group plays Schackfyran scoring', () => {
		const groups = [group(10, PointSystem.SCHACK4AN), group(11, PointSystem.SCHACK4AN)];
		expect(hasIndividualPerformance(tournament(INDIVIDUAL, groups))).toBe(false);
	});

	it('is offered when at least one group is ordinary', () => {
		const groups = [group(10, PointSystem.SCHACK4AN), group(11)];
		expect(hasIndividualPerformance(tournament(INDIVIDUAL, groups))).toBe(true);
	});

	it('is not offered before the tournament is known', () => {
		expect(hasIndividualPerformance(null)).toBe(false);
	});
});

describe('performanceInputs', () => {
	it('merges every individual group’s players and keeps each group’s rounds', () => {
		const inputs = performanceInputs([
			printGroup(10, [row(1, 2, '2026-10-05')], [player(1, '2026-10-01')]),
			printGroup(11, [row(3, 4, '2026-10-05')], [player(3, '2026-10-01')])
		]);
		expect([...inputs.roundResults.keys()]).toEqual([10, 11]);
		expect([...inputs.snapshot.keys()]).toEqual([1, 3]);
	});

	it('leaves team groups out', () => {
		const inputs = performanceInputs([printGroup(10, [row(1, 2, '2026-10-05')], [], 'team')]);
		expect(inputs.roundResults.size).toBe(0);
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
