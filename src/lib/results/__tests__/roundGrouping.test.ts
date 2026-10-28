import { describe, it, expect } from 'vitest';
import { normalizeEloLookupDate, type TournamentRoundResultDto } from '$lib/api';
import {
	currentRound,
	formatMatchDate,
	formatRoundDate,
	groupByRound,
	parseDateToTimestamp,
	playerDateLookups,
	resolveActiveRound,
	roundNumbers
} from '../roundGrouping';

const game = (
	roundNr: number | undefined,
	homeId = 1,
	awayId = 2,
	date = '2025-01-15'
): TournamentRoundResultDto => ({ roundNr, homeId, awayId, date }) as TournamentRoundResultDto;

describe('parseDateToTimestamp', () => {
	it('reads an ISO date', () => {
		expect(parseDateToTimestamp('2025-01-15')).toBe(Date.parse('2025-01-15'));
	});

	it('reads an epoch that arrived as a string', () => {
		expect(parseDateToTimestamp('1736899200000')).toBe(1736899200000);
	});

	it('prefers the numeric reading, which Date would misparse as a year', () => {
		// `new Date('1737')` is the year 1737, not a failure — so a numeric string
		// falling through to Date would land three centuries off rather than
		// being rejected.
		expect(parseDateToTimestamp('1737')).toBe(1737);
	});

	it('is NaN for what it cannot read', () => {
		expect(parseDateToTimestamp('not a date')).toBeNaN();
		expect(parseDateToTimestamp(undefined)).toBeNaN();
		expect(parseDateToTimestamp('')).toBeNaN();
	});

	it('rejects a numeric string that is not a usable timestamp', () => {
		// The React version fell through to `new Date('0')`, which is the year
		// 2000 — so a zeroed date field printed as a real round date.
		expect(parseDateToTimestamp('0')).toBeNaN();
		expect(parseDateToTimestamp('-1')).toBeNaN();
	});
});

describe('formatRoundDate', () => {
	it('is compact and locale-aware', () => {
		expect(formatRoundDate('2025-01-15', 'sv-SE')).toBe('25-01-15');
		expect(formatRoundDate('2025-01-15', 'en-US')).toBe('1/15/25');
	});

	it('renders nothing rather than "Invalid Date" for an unusable value', () => {
		expect(formatRoundDate(undefined, 'sv-SE')).toBe('');
		expect(formatRoundDate('not a date', 'sv-SE')).toBe('');
		expect(formatRoundDate('0', 'sv-SE')).toBe('');
	});
});

describe('formatMatchDate', () => {
	it('spells the month out — a team match has a line to itself', () => {
		expect(formatMatchDate('2026-01-15', 'sv-SE')).toMatch(/januari/);
		expect(formatMatchDate('2026-01-15', 'en-US')).toMatch(/January/);
	});

	it('is the long form where formatRoundDate is the compact one', () => {
		// The round tabs are a cramped horizontal strip; a team's own page is not.
		expect(formatRoundDate('2026-01-15', 'sv-SE')).toBe('26-01-15');
		expect(formatMatchDate('2026-01-15', 'sv-SE')).not.toBe('26-01-15');
	});

	it('renders nothing rather than "Invalid Date" for an unusable value', () => {
		expect(formatMatchDate(undefined, 'sv-SE')).toBe('');
		expect(formatMatchDate('not a date', 'sv-SE')).toBe('');
		expect(formatMatchDate('0', 'sv-SE')).toBe('');
	});
});

describe('groupByRound', () => {
	it('indexes games by their round', () => {
		const byRound = groupByRound([game(1), game(2), game(1)]);
		expect(byRound.get(1)).toHaveLength(2);
		expect(byRound.get(2)).toHaveLength(1);
	});

	it('keeps a row with no round number as round 1 rather than dropping it', () => {
		// Older events omit `roundNr`; dropping those rows would leave the page
		// claiming the tournament has no results at all.
		const byRound = groupByRound([game(undefined), game(undefined)]);
		expect(byRound.get(1)).toHaveLength(2);
	});

	it('preserves the order games arrived in within a round', () => {
		const byRound = groupByRound([game(1, 10), game(2, 30), game(1, 20)]);
		expect(byRound.get(1)?.map((g) => g.homeId)).toEqual([10, 20]);
	});

	it('is empty for no games', () => {
		expect(groupByRound([]).size).toBe(0);
	});
});

describe('roundNumbers', () => {
	it('is ascending and deduplicated', () => {
		expect(roundNumbers([game(3), game(1), game(3), game(2)])).toEqual([1, 2, 3]);
	});

	it('sorts numerically, not as text', () => {
		// The default sort would give [1, 10, 2, 9], which reorders the tabs of
		// any event past round nine.
		const rounds = [1, 2, 9, 10, 11].map((r) => game(r));
		expect(roundNumbers(rounds)).toEqual([1, 2, 9, 10, 11]);
	});

	it('is empty for no games', () => {
		expect(roundNumbers([])).toEqual([]);
	});
});

describe('playerDateLookups', () => {
	const monthOf = (iso: string) => normalizeEloLookupDate(Date.parse(iso));

	it('asks for both players of a real pairing', () => {
		expect(playerDateLookups([game(1, 10, 20)])).toEqual([
			{ playerId: 10, date: monthOf('2025-01-15') },
			{ playerId: 20, date: monthOf('2025-01-15') }
		]);
	});

	it('skips a bye slot', () => {
		// -100 is a bye. schack.se answers negative ids with a 502, so asking is
		// not merely wasteful.
		expect(playerDateLookups([game(1, 10, -100)])).toEqual([
			{ playerId: 10, date: monthOf('2025-01-15') }
		]);
	});

	it('skips a walkover slot', () => {
		expect(playerDateLookups([game(1, -1, 20)])).toEqual([
			{ playerId: 20, date: monthOf('2025-01-15') }
		]);
	});

	it('skips a game whose date it cannot read', () => {
		expect(playerDateLookups([game(1, 10, 20, 'not a date')])).toEqual([]);
	});

	it('normalises to the rating list month', () => {
		const [lookup] = playerDateLookups([game(1, 10, 20, '2025-01-15')]);
		expect(lookup.date).toBe(normalizeEloLookupDate(Date.parse('2025-01-15')));
		expect(lookup.date).not.toBe(Date.parse('2025-01-15'));
	});

	it('has nothing to ask for without games', () => {
		expect(playerDateLookups(undefined)).toEqual([]);
		expect(playerDateLookups([])).toEqual([]);
	});
});

/** A round's games, `done` of them finalized and the rest pending. */
const round = (roundNr: number, games: number, done: number): TournamentRoundResultDto[] =>
	Array.from(
		{ length: games },
		(_, i) => ({ roundNr, homeId: 1, awayId: 2, finalized: i < done }) as TournamentRoundResultDto
	);

describe('currentRound', () => {
	it('moves on to the next round once one is done, with every round paired in advance', () => {
		// 7126/19194: a team round robin paired in full, rounds 1–2 played.
		expect(
			currentRound([
				...round(1, 3, 3),
				...round(2, 3, 3),
				...round(3, 3, 0),
				...round(4, 3, 0),
				...round(5, 3, 0)
			])
		).toBe(3);
	});

	it('stays on a round that is still being played', () => {
		expect(currentRound([...round(1, 5, 5), ...round(2, 5, 2), ...round(3, 5, 0)])).toBe(2);
	});

	it('is not held back by a postponed game in an earlier round', () => {
		// 7018/19284: one game of round 2 still pending while round 5 is under way.
		expect(
			currentRound([
				...round(1, 5, 5),
				...round(2, 5, 4),
				...round(3, 5, 5),
				...round(4, 5, 1),
				...round(5, 5, 0)
			])
		).toBe(4);
	});

	it('shows the next round of a Swiss once it is paired', () => {
		expect(currentRound([...round(1, 4, 4), ...round(2, 4, 0)])).toBe(2);
	});

	it('stays on the last round of a finished event', () => {
		expect(currentRound([...round(1, 4, 4), ...round(2, 4, 4)])).toBe(2);
	});

	it('is the first round before any result is in', () => {
		expect(currentRound([...round(1, 4, 0), ...round(2, 4, 0)])).toBe(1);
	});

	it('is null with no rounds at all', () => {
		expect(currentRound([])).toBeNull();
	});
});

describe('resolveActiveRound', () => {
	it('honours an explicit choice that is still on offer', () => {
		expect(resolveActiveRound(2, [1, 2, 3], 3)).toBe(2);
	});

	it('shows the current round until the visitor picks one', () => {
		expect(resolveActiveRound(null, [1, 2, 3], 2)).toBe(2);
	});

	it('falls back when the chosen round is not in this group', () => {
		// The page stays mounted across group changes, so round 7 of a long event
		// arrives in a three-round group. The React version kept it and rendered an
		// empty table.
		expect(resolveActiveRound(7, [1, 2, 3], 2)).toBe(2);
	});

	it('falls back when a live refresh drops the round being viewed', () => {
		expect(resolveActiveRound(3, [1, 2], 2)).toBe(2);
	});

	it('takes the latest round when there is no current one to go by', () => {
		expect(resolveActiveRound(null, [1, 2, 3], null)).toBe(3);
	});

	it('is null when there are no rounds at all', () => {
		expect(resolveActiveRound(null, [], null)).toBeNull();
		expect(resolveActiveRound(2, [], null)).toBeNull();
	});
});
