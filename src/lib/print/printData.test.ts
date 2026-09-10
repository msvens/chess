import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TournamentDto } from '$lib/api';
import { buildGroupNav, firstGroupId, groupKindOf, loadPrintData } from './printData';

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
			getTournament = (...args: unknown[]) => getTournament(...args);
		},
		ResultsService: class {
			getTournamentResults = (...args: unknown[]) => getTournamentResults(...args);
			getTournamentRoundResults = (...args: unknown[]) => getTournamentRoundResults(...args);
			getTeamTournamentResults = (...args: unknown[]) => getTeamTournamentResults(...args);
			getTeamRoundResults = (...args: unknown[]) => getTeamRoundResults(...args);
		}
	};
});

/** SSF tournament type numbers: 1 individual, 2 Allsvenskan, 9 Schackfyran. */
const INDIVIDUAL = 1;
const ALLSVENSKAN = 2;
const SCHACKFYRAN = 9;

const group = (id: number, name: string) => ({ id, name }) as never;

const tournament = (over: Partial<TournamentDto> = {}): TournamentDto =>
	({
		id: 5835,
		name: 'Test Open',
		type: INDIVIDUAL,
		rootClasses: [{ classID: 1, className: 'Elit', groups: [group(100, 'A'), group(101, 'B')] }],
		...over
	}) as TournamentDto;

const ok = (data: unknown) => ({ status: 200, data });

describe('groupKindOf', () => {
	it('separates the three shapes the endpoints need', () => {
		expect(groupKindOf(INDIVIDUAL)).toBe('individual');
		expect(groupKindOf(ALLSVENSKAN)).toBe('team');
		expect(groupKindOf(SCHACKFYRAN)).toBe('individuallyPairedTeam');
	});

	it('treats a missing type as individual', () => {
		expect(groupKindOf(null)).toBe('individual');
		expect(groupKindOf(undefined)).toBe('individual');
	});
});

describe('firstGroupId', () => {
	it('is the first group in document order', () => {
		expect(firstGroupId(tournament())).toBe(100);
	});

	it('descends into subclasses, and skips classes holding no groups', () => {
		const t = tournament({
			rootClasses: [
				{ classID: 1, className: 'Empty', groups: [], subClasses: [] },
				{
					classID: 2,
					className: 'Parent',
					groups: [],
					subClasses: [{ classID: 3, className: 'Child', groups: [group(200, 'A')] }]
				}
			] as never
		});
		expect(firstGroupId(t)).toBe(200);
	});

	it('is undefined for a tournament with no groups at all', () => {
		expect(firstGroupId(tournament({ rootClasses: [] }))).toBeUndefined();
	});
});

describe('buildGroupNav', () => {
	const t = tournament({
		rootClasses: [
			{ classID: 1, className: 'Elit', groups: [group(100, 'A'), group(101, 'B')] },
			{ classID: 2, className: 'Motion', groups: [group(200, 'C')] },
			{ classID: 3, className: 'Tom', groups: [] }
		] as never
	});

	it('offers only classes that hold groups, each pointing at its first', () => {
		const nav = buildGroupNav(t, 100);
		expect(nav.classOptions).toEqual([
			{ id: 1, label: 'Elit', firstGroupId: 100 },
			{ id: 2, label: 'Motion', firstGroupId: 200 }
		]);
	});

	it('knows which class the current group is in, and lists its siblings', () => {
		expect(buildGroupNav(t, 101)).toMatchObject({
			currentClassId: 1,
			groupOptions: [
				{ id: 100, label: 'A' },
				{ id: 101, label: 'B' }
			]
		});
		expect(buildGroupNav(t, 200)).toMatchObject({
			currentClassId: 2,
			groupOptions: [{ id: 200, label: 'C' }]
		});
	});

	it('names an unnamed class by its id rather than printing nothing', () => {
		const unnamed = tournament({
			rootClasses: [{ classID: 7, className: '', groups: [group(1, 'A')] }] as never
		});
		expect(buildGroupNav(unnamed, 1).classOptions[0].label).toBe('Class 7');
	});

	it('answers with no current class for a group that is not in the tournament', () => {
		expect(buildGroupNav(t, 999)).toMatchObject({ currentClassId: null, groupOptions: [] });
	});
});

describe('loadPrintData', () => {
	beforeEach(() => {
		for (const fn of [
			getTournament,
			getTournamentResults,
			getTournamentRoundResults,
			getTeamTournamentResults,
			getTeamRoundResults
		]) {
			fn.mockReset();
		}
		getTournament.mockResolvedValue(ok(tournament()));
		getTournamentResults.mockResolvedValue(ok([]));
		getTournamentRoundResults.mockResolvedValue(ok([]));
		getTeamTournamentResults.mockResolvedValue(ok([]));
		getTeamRoundResults.mockResolvedValue(ok([]));
	});

	it('throws when the tournament itself cannot be loaded', async () => {
		getTournament.mockResolvedValue({ status: 404 });
		await expect(loadPrintData(5835, 100)).rejects.toThrow();
	});

	it('fetches just the group asked for', async () => {
		await loadPrintData(5835, 101);
		expect(getTournamentResults).toHaveBeenCalledTimes(1);
		expect(getTournamentResults).toHaveBeenCalledWith(101);
	});

	it('fetches every group when none is named', async () => {
		const data = await loadPrintData(5835);
		expect(getTournamentResults.mock.calls.map((c) => c[0])).toEqual([100, 101]);
		expect(data.groups).toHaveLength(2);
	});

	it('is empty, not an error, for a group the tournament does not contain', async () => {
		const data = await loadPrintData(5835, 999);
		expect(data.groups).toEqual([]);
		expect(getTournamentResults).not.toHaveBeenCalled();
	});

	it('indexes the players embedded in the standings, for the pairing sheet', async () => {
		getTournamentResults.mockResolvedValue(
			ok([
				{ contenderId: 1, place: 1, playerInfo: { id: 408550, firstName: 'A', lastName: 'B' } },
				{ contenderId: 2, place: 2, playerInfo: null }
			])
		);
		const data = await loadPrintData(5835, 100);
		expect(data.groups[0].playerMap.get(408550)).toMatchObject({ firstName: 'A' });
		expect(data.groups[0].playerMap.size).toBe(1);
	});

	it('collects the rounds present, ascending, treating a missing number as round 1', async () => {
		getTournamentRoundResults.mockResolvedValue(
			ok([{ roundNr: 3 }, { roundNr: 1 }, {}, { roundNr: 3 }])
		);
		const data = await loadPrintData(5835, 100);
		expect(data.groups[0].rounds).toEqual([1, 3]);
	});

	it('degrades a failed group to empty rows rather than losing the print run', async () => {
		getTournamentResults.mockResolvedValue({ status: 500 });
		getTournamentRoundResults.mockResolvedValue({ status: 0, error: 'fetch failed' });
		const data = await loadPrintData(5835, 100);
		expect(data.groups[0]).toMatchObject({ standings: [], roundResults: [], rounds: [] });
	});

	it('takes the team endpoints for a team-paired tournament', async () => {
		getTournament.mockResolvedValue(ok(tournament({ type: ALLSVENSKAN })));
		const data = await loadPrintData(5835, 100);
		expect(getTeamTournamentResults).toHaveBeenCalledWith(100);
		expect(getTournamentResults).not.toHaveBeenCalled();
		expect(data.groups[0].kind).toBe('team');
	});

	it('fetches nothing at all for a Schackfyran', async () => {
		// The federation withholds these individual standings because the players
		// are children; the API answers anyway, so not asking is the safeguard.
		getTournament.mockResolvedValue(ok(tournament({ type: SCHACKFYRAN })));
		const data = await loadPrintData(5835, 100);

		expect(getTournamentResults).not.toHaveBeenCalled();
		expect(getTournamentRoundResults).not.toHaveBeenCalled();
		expect(getTeamTournamentResults).not.toHaveBeenCalled();
		expect(getTeamRoundResults).not.toHaveBeenCalled();
		expect(data.groups[0].kind).toBe('individuallyPairedTeam');
	});

	it('tells the sheets when the class or group name is worth printing', async () => {
		// One class, two groups: name the group, not the class.
		const single = await loadPrintData(5835, 100);
		expect(single.groups[0]).toMatchObject({ multipleClasses: false, multipleGroups: true });

		getTournament.mockResolvedValue(
			ok(
				tournament({
					rootClasses: [
						{ classID: 1, className: 'Elit', groups: [group(100, 'A')] },
						{ classID: 2, className: 'Motion', groups: [group(200, 'B')] }
					] as never
				})
			)
		);
		const many = await loadPrintData(5835, 100);
		expect(many.groups[0]).toMatchObject({
			multipleClasses: true,
			multipleGroups: false,
			className: 'Elit'
		});
	});
});
