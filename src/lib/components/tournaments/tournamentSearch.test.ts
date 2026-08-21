import { describe, expect, it } from 'vitest';
import type { GroupSearchAnswerDto, TournamentDto } from '$lib/api';
import {
	defaultDateRange,
	deduplicateTournaments,
	groupsToTournaments,
	sortByUpdated,
	toApiDate,
	toDateInput
} from './tournamentSearch';

const tournament = (id: number, latestUpdated?: string, name = `T${id}`) =>
	({ id, name, latestUpdated }) as TournamentDto;

describe('deduplicateTournaments', () => {
	// The date-range endpoint returns a row per updated GROUP, so the same
	// tournament arriving several times is the normal case, not an edge one.
	it('keeps one row per tournament', () => {
		const out = deduplicateTournaments([
			tournament(1, '2026-08-01T10:00:00Z'),
			tournament(1, '2026-08-02T10:00:00Z'),
			tournament(2, '2026-08-01T10:00:00Z')
		]);
		expect(out.map((t) => t.id).sort()).toEqual([1, 2]);
	});

	it('keeps the most recently updated copy', () => {
		const out = deduplicateTournaments([
			tournament(1, '2026-08-01T10:00:00Z', 'older'),
			tournament(1, '2026-08-05T10:00:00Z', 'newer')
		]);
		expect(out[0].name).toBe('newer');
	});

	it('is order-independent', () => {
		const a = deduplicateTournaments([
			tournament(1, '2026-08-05T10:00:00Z', 'newer'),
			tournament(1, '2026-08-01T10:00:00Z', 'older')
		]);
		expect(a[0].name).toBe('newer');
	});

	it('treats a missing timestamp as oldest rather than throwing', () => {
		const out = deduplicateTournaments([
			tournament(1, undefined, 'no date'),
			tournament(1, '2026-08-01T10:00:00Z', 'dated')
		]);
		expect(out[0].name).toBe('dated');
	});

	it('handles an empty list', () => {
		expect(deduplicateTournaments([])).toEqual([]);
	});
});

describe('sortByUpdated', () => {
	it('puts the most recent first', () => {
		const out = sortByUpdated([
			tournament(1, '2026-08-01T00:00:00Z'),
			tournament(2, '2026-08-09T00:00:00Z'),
			tournament(3, '2026-08-05T00:00:00Z')
		]);
		expect(out.map((t) => t.id)).toEqual([2, 3, 1]);
	});

	it('does not mutate the input', () => {
		const input = [tournament(1, '2026-08-01T00:00:00Z'), tournament(2, '2026-08-09T00:00:00Z')];
		const before = input.map((t) => t.id);
		sortByUpdated(input);
		expect(input.map((t) => t.id)).toEqual(before);
	});
});

describe('groupsToTournaments', () => {
	const group = (tournamentid: number, tournamentname: string, latestUpdatedGame?: string) =>
		({ tournamentid, tournamentname, latestUpdatedGame }) as GroupSearchAnswerDto;

	it('collapses several groups of one tournament into a single row', () => {
		const out = groupsToTournaments([
			group(10, 'Vasteras Open'),
			group(10, 'Vasteras Open'),
			group(11, 'Rilton Cup')
		]);
		expect(out).toHaveLength(2);
		expect(out.map((t) => t.id)).toEqual([10, 11]);
	});

	it('carries the tournament id and name across', () => {
		const [t] = groupsToTournaments([group(10, 'Vasteras Open', '2026-08-01T00:00:00Z')]);
		expect(t).toMatchObject({ id: 10, name: 'Vasteras Open' });
		expect(t.latestUpdated).toBe('2026-08-01T00:00:00Z');
	});

	// Text search answers carry no dates or type, which is why the category, type
	// and status filters cannot say anything useful about these results.
	it('leaves the fields the search does not provide empty', () => {
		const [t] = groupsToTournaments([group(10, 'Vasteras Open')]);
		expect(t.start).toBe('');
		expect(t.end).toBe('');
		expect(t.type).toBe(0);
	});
});

describe('defaultDateRange', () => {
	it('spans the last ten days, ending today', () => {
		const range = defaultDateRange(new Date(2026, 7, 21, 12, 0));
		expect(range.end).toBe('2026-08-21');
		expect(range.start).toBe('2026-08-11');
	});

	it('rolls back across a month boundary', () => {
		const range = defaultDateRange(new Date(2026, 7, 5, 12, 0));
		expect(range.start).toBe('2026-07-26');
	});

	// The React version built this with toISOString(), which is UTC. Just after
	// midnight in Sweden (UTC+2) that yields yesterday, so the default range
	// silently started and ended a day early.
	it('uses local dates, so just after midnight it still means today', () => {
		const justAfterMidnight = new Date(2026, 7, 21, 0, 30);
		expect(defaultDateRange(justAfterMidnight).end).toBe('2026-08-21');
		expect(justAfterMidnight.toISOString().split('T')[0]).not.toBe('2026-08-21');
	});
});

describe('toDateInput / toApiDate', () => {
	it('zero-pads month and day', () => {
		expect(toDateInput(new Date(2026, 0, 5))).toBe('2026-01-05');
	});

	it('appends the midnight time the SSF endpoints expect', () => {
		expect(toApiDate('2026-08-21')).toBe('2026-08-21T00:00:00');
	});
});
