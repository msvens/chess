import { describe, expect, it } from 'vitest';
import type { GameDto, PlayerInfoDto, TournamentClassDto, TournamentDto } from '$lib/api';
import {
	buildParticipations,
	opponentIds,
	playedGroupIds,
	playerMapFor,
	recordsByGroup,
	tournamentMapFor,
	upcomingGroupIds
} from '$lib/player/participations';

const ME = 500;

/** `result` defaults to a white win, so tests say only what they care about. */
const game = (over: Partial<GameDto> = {}): GameDto =>
	({
		id: 1,
		groupiD: 10,
		whiteId: ME,
		blackId: 600,
		result: 1,
		tableNr: 0,
		...over
	}) as GameDto;

interface TestGroup {
	id: number;
	name: string;
	start?: string;
	end?: string;
}

/** One class holding the given groups. The DTO has nine more fields nothing here reads. */
const cls = (className: string, groups: TestGroup[]): TournamentClassDto =>
	({ className, subClasses: [], groups }) as unknown as TournamentClassDto;

const groupA: TestGroup = {
	id: 10,
	name: 'Grupp A',
	start: '2025-12-27',
	end: '2026-01-05'
};

/**
 * A tournament with one class holding one group, which is the ordinary shape.
 * `hasMultipleClasses` is false for it, per the SDK's rule.
 */
const tournament = (
	over: Partial<TournamentDto> = {},
	rootClasses: TournamentClassDto[] = [cls('Elit', [groupA])]
): TournamentDto =>
	({
		id: 1,
		name: 'Rilton Cup',
		type: 3, // INDIVIDUAL
		start: '2025-12-27',
		end: '2026-01-05',
		rootClasses,
		...over
	}) as TournamentDto;

const person = (id: number) => ({ id, firstName: 'A', lastName: 'B' }) as unknown as PlayerInfoDto;

const lookup = (entries: Record<number, TournamentDto>) => (groupId: number) => entries[groupId];

describe('which opponents are worth fetching', () => {
	it('drops the player themselves', () => {
		expect(opponentIds([game({ whiteId: ME, blackId: 600 })], ME)).toEqual([600]);
	});

	it('drops byes and walkovers, whichever negative id they use', () => {
		// schack.se answers a negative id with a 502, so asking is not merely
		// wasteful. The React version guarded -1 only.
		const games = [
			game({ blackId: -1 }),
			game({ blackId: -100 }),
			game({ blackId: -200 }),
			game({ blackId: 601 })
		];
		expect(opponentIds(games, ME)).toEqual([601]);
	});

	it('names each opponent once however often they were played', () => {
		const games = [game({ blackId: 600 }), game({ blackId: 600 }), game({ blackId: 601 })];
		expect(opponentIds(games, ME)).toEqual([600, 601]);
	});

	it('finds the opponent whichever colour the player had', () => {
		const games = [game({ whiteId: 600, blackId: ME }), game({ whiteId: ME, blackId: 601 })];
		expect(opponentIds(games, ME).sort()).toEqual([600, 601]);
	});
});

describe('the groups a player has games in', () => {
	it('lists each group once, in first-seen order', () => {
		const games = [game({ groupiD: 30 }), game({ groupiD: 10 }), game({ groupiD: 30 })];
		expect(playedGroupIds(games)).toEqual([30, 10]);
	});
});

describe('a player’s record in a group', () => {
	it('splits wins, draws and losses from the player’s side', () => {
		const games = [
			game({ whiteId: ME, result: 1 }), // won as white
			game({ whiteId: ME, result: -1 }), // lost as white
			game({ whiteId: 600, blackId: ME, result: -1 }), // won as black
			game({ result: 0 }) // drew
		];
		const record = recordsByGroup(games, ME).get(10);
		expect(record).toMatchObject({ wins: 2, draws: 1, losses: 1, gameCount: 4 });
	});

	it('sums points in the event’s own system', () => {
		// Schackfyran pays 3 for a win, not 1 — the result code carries the system.
		const games = [game({ result: 3 }), game({ result: 10 })]; // win, draw
		expect(recordsByGroup(games, ME).get(10)?.totalPoints).toBe(5);
	});

	it('counts a walkover as a win — it is one', () => {
		// Not the same as "no result". A walkover awards a full point (a tourist
		// walkover, 29, awards a half), so it belongs in the W/D/L split.
		expect(recordsByGroup([game({ result: 2 })], ME).get(10)).toMatchObject({
			gameCount: 1,
			wins: 1,
			totalPoints: 1
		});
		expect(recordsByGroup([game({ result: 29 })], ME).get(10)?.totalPoints).toBe(0.5);
	});

	it('leaves a code that is not a result out of the split, but still counts the row', () => {
		// Not set, postponed and the double forfeit score nothing for either side.
		for (const result of [-100, 100, -3, -10]) {
			expect(recordsByGroup([game({ result })], ME).get(10)).toMatchObject({
				gameCount: 1,
				wins: 0,
				draws: 0,
				losses: 0,
				totalPoints: 0
			});
		}
	});

	it('keeps groups apart', () => {
		const games = [game({ groupiD: 10, result: 1 }), game({ groupiD: 20, result: -1 })];
		const records = recordsByGroup(games, ME);
		expect(records.get(10)?.wins).toBe(1);
		expect(records.get(20)?.losses).toBe(1);
	});
});

describe('building the history list', () => {
	it('carries the group’s own dates and name, not the tournament’s', () => {
		const rilton = tournament();
		const [row] = buildParticipations([game()], [], ME, lookup({ 10: rilton }));

		expect(row).toMatchObject({
			groupId: 10,
			groupName: 'Grupp A',
			groupStartDate: '2025-12-27',
			className: 'Elit',
			hasMultipleClasses: false,
			isTeam: false,
			gameCount: 1,
			wins: 1
		});
	});

	it('falls back to the tournament’s dates when the group has none', () => {
		const t = tournament({}, [cls('Open', [{ id: 10, name: 'A' }])]);
		const [row] = buildParticipations([game()], [], ME, lookup({ 10: t }));
		expect(row.groupStartDate).toBe('2025-12-27');
		expect(row.groupEndDate).toBe('2026-01-05');
	});

	it('orders newest first, by the group’s end date', () => {
		const older = tournament({ id: 1, name: 'Older' });
		const newer = tournament({ id: 2, name: 'Newer' }, [
			cls('Open', [{ id: 20, name: 'B', start: '2026-03-01', end: '2026-03-08' }])
		]);

		const rows = buildParticipations(
			[game({ groupiD: 10 }), game({ groupiD: 20 })],
			[],
			ME,
			lookup({ 10: older, 20: newer })
		);
		expect(rows.map((r) => r.tournament.name)).toEqual(['Newer', 'Older']);
	});

	it('marks a team event as one', () => {
		const allsvenskan = tournament({ type: 2 });
		const [row] = buildParticipations([game()], [], ME, lookup({ 10: allsvenskan }));
		expect(row.isTeam).toBe(true);
	});

	it('adds registered-but-unplayed events with an empty record', () => {
		const played = tournament({ id: 1, name: 'Played' });
		const upcoming = tournament({ id: 2, name: 'Upcoming' }, [
			cls('Open', [{ id: 20, name: 'B', start: '2026-06-01', end: '2026-06-02' }])
		]);

		const rows = buildParticipations(
			[game({ groupiD: 10 })],
			[20],
			ME,
			lookup({ 10: played, 20: upcoming })
		);
		expect(rows[0]).toMatchObject({
			tournament: expect.objectContaining({ name: 'Upcoming' }),
			isUpcoming: true,
			gameCount: 0,
			wins: 0,
			totalPoints: 0
		});
		expect(rows[1].isUpcoming).toBeUndefined();
	});

	it('leaves upcoming team events out — the club entered, not the player', () => {
		const t = tournament({ type: 2 });
		expect(buildParticipations([], [10], ME, lookup({ 10: t }))).toEqual([]);
	});

	it('skips a group whose tournament is not known yet', () => {
		// The batch fetch may not have landed, or may have failed for one id.
		// A half-built row is worse than no row.
		const rows = buildParticipations([game({ groupiD: 10 })], [], ME, lookup({}));
		expect(rows).toEqual([]);
	});

	it('shows the class name only when the event has more than one class', () => {
		const t = tournament({}, [
			cls('Elit', [{ id: 10, name: 'A', start: '2025-01-01', end: '2025-01-02' }]),
			cls('Motion', [{ id: 20, name: 'B', start: '2025-01-01', end: '2025-01-02' }])
		]);
		const [row] = buildParticipations([game({ groupiD: 10 })], [], ME, lookup({ 10: t }));
		expect(row.hasMultipleClasses).toBe(true);
		expect(row.className).toBe('Elit');
	});
});

describe('events entered but not played', () => {
	it('drops the ones already known from a game', () => {
		// The two endpoints overlap: the entry list holds everything entered.
		expect(upcomingGroupIds([{ groupId: 10 }, { groupId: 30 }], [10])).toEqual([30]);
	});

	it('lists a repeated entry once', () => {
		expect(upcomingGroupIds([{ groupId: 30 }, { groupId: 30 }], [])).toEqual([30]);
	});

	it('is empty when everything has been played', () => {
		expect(upcomingGroupIds([{ groupId: 10 }], [10])).toEqual([]);
	});
});

describe('the maps handed to the SDK', () => {
	it('keys tournaments by group, played and upcoming alike', () => {
		const played = tournament({ id: 1 });
		const upcoming = tournament({ id: 2 }, [cls('Open', [{ id: 20, name: 'B' }])]);
		const map = tournamentMapFor(
			[game({ groupiD: 10 })],
			[20],
			lookup({ 10: played, 20: upcoming })
		);

		expect([...map.keys()].sort()).toEqual([10, 20]);
		expect(map.get(20)?.id).toBe(2);
	});

	it('leaves out a group the cache cannot answer for', () => {
		// The helpers treat an absent group as unrated rather than crashing.
		expect(tournamentMapFor([game()], [], lookup({})).size).toBe(0);
	});

	it('keys players by id, the member included', () => {
		const known: Record<number, PlayerInfoDto> = { 500: person(500), 600: person(600) };
		const map = playerMapFor([game({ blackId: 600 })], ME, (id) => known[id]);
		expect([...map.keys()].sort()).toEqual([500, 600]);
	});

	it('leaves out an opponent not yet fetched', () => {
		const map = playerMapFor([game({ blackId: 600 })], ME, () => undefined);
		expect(map.size).toBe(0);
	});

	it('never asks about a bye or walkover slot', () => {
		const asked: number[] = [];
		playerMapFor([game({ blackId: -1 })], ME, (id) => {
			asked.push(id);
			return undefined;
		});
		expect(asked).toEqual([ME]);
	});
});
