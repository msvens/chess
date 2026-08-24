import { describe, expect, it } from 'vitest';
import type { GameDto, PlayerInfoDto, TournamentClassDto, TournamentDto } from '$lib/api';
import {
	eloChanges,
	groupMetaFor,
	headToHeadGames,
	ratingRequests,
	summarise,
	type GroupMeta
} from '$lib/player/headToHead';

const ME = 500;
const RIVAL = 600;

/** Real SDK codes: 1 standard Elo, 6 rapid, 7 blitz, 3 LASK, 5 no rating. */
const RANKING = { standard: 1, rapid: 6, blitz: 7, lask: 3, none: 5 } as const;

const game = (over: Partial<GameDto> = {}): GameDto =>
	({ id: 1, groupiD: 10, whiteId: ME, blackId: RIVAL, result: 1, ...over }) as GameDto;

const cls = (groups: { id: number; name: string; start?: string; rankingAlgorithm?: number }[]) =>
	({ className: 'Open', subClasses: [], groups }) as unknown as TournamentClassDto;

/** `start: null` means the group carries no date of its own. */
const tournament = (
	groupId: number,
	rankingAlgorithm: number,
	start: string | null = '2025-01-15',
	tournamentStart = '2025-01-10'
): TournamentDto =>
	({
		id: groupId * 10,
		name: `Tournament ${groupId}`,
		type: 3,
		start: tournamentStart,
		end: '2025-01-20',
		rootClasses: [cls([{ id: groupId, name: 'A', start: start ?? undefined, rankingAlgorithm }])]
	}) as unknown as TournamentDto;

const player = (
	id: number,
	elo: Record<string, unknown> | null,
	birthdate = '1990'
): PlayerInfoDto =>
	({ id, firstName: 'A', lastName: 'B', birthdate, elo }) as unknown as PlayerInfoDto;

/** January 2025, as `normalizeEloLookupDate` would render it. */
const JAN = new Date(2025, 0, 1).getTime();

const lookup = (entries: Record<number, TournamentDto>) => (groupId: number) => entries[groupId];

describe('picking out the shared games', () => {
	it('keeps games between these two, whichever colour each had', () => {
		const games = [
			game({ id: 1, whiteId: ME, blackId: RIVAL }),
			game({ id: 2, whiteId: RIVAL, blackId: ME }),
			game({ id: 3, whiteId: ME, blackId: 777 }),
			game({ id: 4, whiteId: 777, blackId: 888 })
		];
		expect(headToHeadGames(games, ME, RIVAL).map((g) => g.id)).toEqual([1, 2]);
	});
});

describe('when and how a group counted', () => {
	it('takes the date from the group, not the tournament', () => {
		const meta = groupMetaFor([game()], lookup({ 10: tournament(10, RANKING.blitz) }));
		expect(meta.get(10)).toEqual({ date: JAN, rankingAlgorithm: RANKING.blitz });
	});

	it('falls back to the tournament when the group has no start', () => {
		const meta = groupMetaFor(
			[game()],
			lookup({ 10: tournament(10, RANKING.standard, null, '2024-06-05') })
		);
		expect(meta.get(10)?.date).toBe(new Date(2024, 5, 1).getTime());
	});

	it('reads the date as local — a UTC parse would slip a month at a boundary', () => {
		const meta = groupMetaFor(
			[game()],
			lookup({ 10: tournament(10, RANKING.standard, '2025-03-01') })
		);
		expect(meta.get(10)?.date).toBe(new Date(2025, 2, 1).getTime());
	});

	it('skips a group whose tournament is not known', () => {
		expect(groupMetaFor([game()], lookup({})).size).toBe(0);
	});

	it('skips a group whose date cannot be read', () => {
		expect(
			groupMetaFor([game()], lookup({ 10: tournament(10, 1, 'nonsense', 'nonsense') })).size
		).toBe(0);
	});

	it('looks each group up once however many games it holds', () => {
		let calls = 0;
		groupMetaFor([game({ id: 1 }), game({ id: 2 }), game({ id: 3 })], (id) => {
			calls += 1;
			return tournament(id, RANKING.standard);
		});
		expect(calls).toBe(1);
	});
});

describe('which ratings to fetch', () => {
	const meta = new Map<number, GroupMeta>([
		[10, { date: JAN, rankingAlgorithm: 1 }],
		[20, { date: JAN, rankingAlgorithm: 1 }],
		[30, { date: new Date(2026, 0, 1).getTime(), rankingAlgorithm: 1 }]
	]);

	it('asks for both players at every distinct month', () => {
		const requests = ratingRequests(meta, ME, RIVAL);
		expect(requests).toHaveLength(4);
		expect(requests.filter((r) => r.date === JAN)).toHaveLength(2);
	});

	it('asks once for two groups in the same month', () => {
		// Two events in January must not become four requests.
		const requests = ratingRequests(meta, ME, RIVAL);
		expect(new Set(requests.map((r) => `${r.playerId}-${r.date}`)).size).toBe(requests.length);
	});
});

describe('what each game did to the rating', () => {
	const meta = new Map<number, GroupMeta>([
		[10, { date: JAN, rankingAlgorithm: RANKING.standard }]
	]);
	const records: Record<number, PlayerInfoDto> = {
		[ME]: player(ME, { rating: 2000, k: 20 }),
		[RIVAL]: player(RIVAL, { rating: 2000 })
	};
	const at: (id: number) => PlayerInfoDto | undefined = (id) => records[id];

	it('gains on a win against an equal', () => {
		const changes = eloChanges([game({ result: 1 })], ME, RIVAL, meta, at);
		expect(changes.get(1)).toBeGreaterThan(0);
	});

	it('loses on a loss', () => {
		const changes = eloChanges([game({ result: -1 })], ME, RIVAL, meta, at);
		expect(changes.get(1)).toBeLessThan(0);
	});

	it('is unmoved by a draw between equals', () => {
		const changes = eloChanges([game({ result: 0 })], ME, RIVAL, meta, at);
		expect(changes.get(1)).toBe(0);
	});

	it('counts the same whichever colour the player had', () => {
		const asWhite = eloChanges([game({ result: 1 })], ME, RIVAL, meta, at).get(1);
		const asBlack = eloChanges(
			[game({ whiteId: RIVAL, blackId: ME, result: -1 })],
			ME,
			RIVAL,
			meta,
			at
		).get(1);
		expect(asBlack).toBe(asWhite);
	});

	it('has nothing to say about a walkover', () => {
		expect(eloChanges([game({ result: 2 })], ME, RIVAL, meta, at).size).toBe(0);
	});

	it('has nothing to say about a game that is not a result', () => {
		expect(eloChanges([game({ result: -100 })], ME, RIVAL, meta, at).size).toBe(0);
	});

	it('has nothing to say when a rating is missing', () => {
		// Excluded, not counted as zero — a zero would drag a performance rating
		// down by hundreds of points.
		const noElo: (id: number) => PlayerInfoDto | undefined = (id) =>
			id === ME ? records[ME] : player(RIVAL, null);
		expect(eloChanges([game()], ME, RIVAL, meta, noElo).size).toBe(0);
	});

	it('has nothing to say when the group is unrated', () => {
		const unrated = new Map<number, GroupMeta>([
			[10, { date: JAN, rankingAlgorithm: RANKING.none }]
		]);
		expect(eloChanges([game()], ME, RIVAL, unrated, at).size).toBe(0);
	});

	it('has nothing to say about a LASK-ranked group', () => {
		// A LASK rating lives on `player.lask`, not `player.elo`, so the strict
		// lookup answers with no rating at all and the game is excluded.
		const lask = new Map<number, GroupMeta>([[10, { date: JAN, rankingAlgorithm: RANKING.lask }]]);
		expect(eloChanges([game()], ME, RIVAL, lask, at).size).toBe(0);
	});
});

describe('the summary', () => {
	const meta = new Map<number, GroupMeta>([
		[10, { date: JAN, rankingAlgorithm: RANKING.standard }],
		[20, { date: JAN, rankingAlgorithm: RANKING.blitz }]
	]);
	const records: Record<number, PlayerInfoDto> = {
		[ME]: player(ME, { rating: 2000, blitzRating: 1900, k: 20 }),
		[RIVAL]: player(RIVAL, { rating: 2000, blitzRating: 1900 })
	};
	const at: (id: number) => PlayerInfoDto | undefined = (id) => records[id];

	it('counts a win as one, a draw as a half and a loss as nothing', () => {
		const games = [
			game({ id: 1, result: 1 }),
			game({ id: 2, result: 0 }),
			game({ id: 3, result: -1 })
		];
		const summary = summarise(games, ME, RIVAL, meta, at);
		expect(summary.totalScore).toBe(1.5);
		expect(summary.playedCount).toBe(3);
	});

	it('does not score in the event’s own point system', () => {
		// Code 3 is a Schackfyran win, worth 3 points there. A head-to-head spans
		// many events, so adding a Schackfyran 3 to an ordinary 1 would produce a
		// number that means nothing — here it counts as one win.
		const summary = summarise([game({ id: 1, result: 3 })], ME, RIVAL, meta, at);
		expect(summary.totalScore).toBe(1);
		expect(summary.playedCount).toBe(1);
	});

	it('keeps each rating list in its own bucket', () => {
		// Standard and blitz Elo come from different lists and must never be summed.
		const games = [game({ id: 1, groupiD: 10 }), game({ id: 2, groupiD: 20 })];
		const summary = summarise(games, ME, RIVAL, meta, at);
		expect(summary.ratedTypes).toEqual(['standard', 'blitz']);
		expect(summary.byRatingType.standard.gameCount).toBe(1);
		expect(summary.byRatingType.blitz.gameCount).toBe(1);
		expect(summary.byRatingType.rapid.gameCount).toBe(0);
	});

	it('counts a played game even when its tournament is unknown', () => {
		// It was still played; only the Elo buckets need the metadata.
		const summary = summarise([game({ groupiD: 999 })], ME, RIVAL, meta, at);
		expect(summary.playedCount).toBe(1);
		expect(summary.totalScore).toBe(1);
		expect(summary.ratedTypes).toEqual([]);
	});

	it('leaves walkovers out of the score entirely', () => {
		const summary = summarise([game({ result: 2 })], ME, RIVAL, meta, at);
		expect(summary.playedCount).toBe(0);
		expect(summary.totalScore).toBe(0);
	});

	it('collects the opponent’s rating for the performance calculation', () => {
		const summary = summarise([game()], ME, RIVAL, meta, at);
		expect(summary.byRatingType.standard.opponentRatings).toEqual([2000]);
	});

	it('has no rated types when nothing was rated', () => {
		const summary = summarise([game()], ME, RIVAL, new Map(), at);
		expect(summary.ratedTypes).toEqual([]);
		expect(summary.playedCount).toBe(1);
	});
});
