import { describe, it, expect } from 'vitest';
import { normalizeEloLookupDate, type TournamentRoundResultDto } from '$lib/api';
import {
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

describe('resolveActiveRound', () => {
	it('honours an explicit choice that is still on offer', () => {
		expect(resolveActiveRound(2, [1, 2, 3])).toBe(2);
	});

	it('shows the latest round until the visitor picks one', () => {
		expect(resolveActiveRound(null, [1, 2, 3])).toBe(3);
	});

	it('falls back when the chosen round is not in this group', () => {
		// The page stays mounted across group changes, so round 7 of a long event
		// arrives in a three-round group. The React version kept it and rendered an
		// empty table.
		expect(resolveActiveRound(7, [1, 2, 3])).toBe(3);
	});

	it('falls back when a live refresh drops the round being viewed', () => {
		expect(resolveActiveRound(3, [1, 2])).toBe(2);
	});

	it('is null when there are no rounds at all', () => {
		expect(resolveActiveRound(null, [])).toBeNull();
		expect(resolveActiveRound(2, [])).toBeNull();
	});
});
