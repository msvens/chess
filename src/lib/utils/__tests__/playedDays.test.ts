import { describe, expect, it } from 'vitest';
import type { TournamentDto } from '$lib/api';
import { toDayNumber } from '$lib/utils/calendarLayout';
import { datedDays, playedDays, playedOn } from '$lib/utils/playedDays';

const INDIVIDUAL = 3;
const GRAND_PRIX = 7;

interface GroupSpec {
	id: number;
	rounds?: string[];
	start?: string;
	end?: string;
}

const group = ({ id, rounds = [], start = '', end = '' }: GroupSpec) => ({
	id,
	name: `Grupp ${id}`,
	start,
	end,
	tournamentRounds: rounds.map((roundDate, i) => ({ roundNumber: i + 1, roundDate }))
});

/** A tournament whose classes each hold the given groups. */
function tournament(
	over: Partial<TournamentDto>,
	classes: { groups: GroupSpec[]; subClasses?: { groups: GroupSpec[] }[] }[] = []
): TournamentDto {
	const rootClasses = classes.map((c, i) => ({
		classID: i + 1,
		className: `Klass ${i + 1}`,
		groups: c.groups.map(group),
		subClasses: (c.subClasses ?? []).map((sub, j) => ({
			classID: 100 + j,
			className: `Under ${j + 1}`,
			groups: sub.groups.map(group),
			subClasses: []
		}))
	}));
	return {
		id: 1,
		name: 'KM',
		type: INDIVIDUAL,
		start: '2026-09-01',
		end: '2026-12-15',
		...over,
		rootClasses
	} as unknown as TournamentDto;
}

const day = (iso: string) => toDayNumber(new Date(`${iso}T12:00:00`));
const groupIds = (event: ReturnType<typeof playedDays>, iso: string) =>
	event.days.get(day(iso))?.map((g) => g.id);

describe('a group with round dates', () => {
	it('plays on each of them, and on no other day', () => {
		const event = playedDays(
			tournament({}, [{ groups: [{ id: 10, rounds: ['2026-11-17', '2026-11-24'] }] }])
		);
		expect([...event.days.keys()]).toEqual([day('2026-11-17'), day('2026-11-24')]);
		expect(groupIds(event, '2026-11-17')).toEqual([10]);
		expect(event.marker).toBe(false);
	});

	it('names every group playing on a day, subclasses included, in class order', () => {
		const event = playedDays(
			tournament({}, [
				{
					groups: [{ id: 10, rounds: ['2026-11-17'] }],
					subClasses: [{ groups: [{ id: 11, rounds: ['2026-11-17'] }] }]
				},
				{
					groups: [
						{ id: 20, rounds: ['2026-11-17'] },
						{ id: 21, rounds: ['2026-11-18'] }
					]
				}
			])
		);
		expect(groupIds(event, '2026-11-17')).toEqual([10, 11, 20]);
		expect(groupIds(event, '2026-11-18')).toEqual([21]);
	});

	it('ignores a round dated outside the tournament', () => {
		const event = playedDays(
			tournament({}, [{ groups: [{ id: 10, rounds: ['2025-11-17', '2026-11-17'] }] }])
		);
		expect([...event.days.keys()]).toEqual([day('2026-11-17')]);
	});

	it('ignores a round dated outside its own group', () => {
		const event = playedDays(
			tournament({}, [
				{
					groups: [
						{ id: 10, start: '2026-11-01', end: '2026-11-30', rounds: ['2026-10-06', '2026-11-17'] }
					]
				}
			])
		);
		expect([...event.days.keys()]).toEqual([day('2026-11-17')]);
	});

	it('does not filter by a range that is reversed, since it says nothing', () => {
		const event = playedDays(
			tournament({ start: '2026-12-15', end: '2026-09-01' }, [
				{ groups: [{ id: 10, rounds: ['2026-11-17'] }] }
			])
		);
		expect(groupIds(event, '2026-11-17')).toEqual([10]);
	});
});

describe('without round dates', () => {
	it('plays every day of the group’s own short range', () => {
		const event = playedDays(
			tournament({}, [{ groups: [{ id: 10, start: '2026-11-21', end: '2026-11-22' }] }])
		);
		expect([...event.days.keys()]).toEqual([day('2026-11-21'), day('2026-11-22')]);
		expect(groupIds(event, '2026-11-22')).toEqual([10]);
		expect(event.marker).toBe(false);
	});

	it('falls back to the tournament’s range when the group has none', () => {
		const event = playedDays(
			tournament({ start: '2026-11-21', end: '2026-11-22' }, [{ groups: [{ id: 10 }] }])
		);
		expect(groupIds(event, '2026-11-21')).toEqual([10]);
		expect(groupIds(event, '2026-11-22')).toEqual([10]);
	});

	it('uses the tournament’s own dates when it has no groups', () => {
		const event = playedDays(tournament({ start: '2026-11-21', end: '2026-11-23' }));
		expect(event.days.size).toBe(3);
		expect(event.days.get(day('2026-11-22'))).toEqual([]);
	});

	it('marks a long range on its start day only, rather than painting the season', () => {
		const event = playedDays(tournament({}, [{ groups: [{ id: 10 }] }]));
		expect([...event.days.keys()]).toEqual([day('2026-09-01')]);
		expect(event.marker).toBe(true);
	});

	it('is not a marker when other groups have real round days', () => {
		const event = playedDays(
			tournament({}, [{ groups: [{ id: 10 }, { id: 11, rounds: ['2026-11-17'] }] }])
		);
		expect(event.marker).toBe(false);
		expect(groupIds(event, '2026-11-17')).toEqual([11]);
	});
});

describe('a Grand Prix series', () => {
	it('is a marker on its start day, whatever its rounds say', () => {
		const event = playedDays(
			tournament({ type: GRAND_PRIX }, [{ groups: [{ id: 10, rounds: ['2026-11-17'] }] }])
		);
		expect([...event.days.keys()]).toEqual([day('2026-09-01')]);
		expect(event.marker).toBe(true);
	});
});

describe('playedOn', () => {
	it('lists the tournaments played on a day, each with its groups for that day', () => {
		const events = [
			playedDays(tournament({ id: 1 }, [{ groups: [{ id: 10, rounds: ['2026-11-17'] }] }])),
			playedDays(tournament({ id: 2 }, [{ groups: [{ id: 20, rounds: ['2026-11-18'] }] }])),
			playedDays(tournament({ id: 3, start: '2026-11-16', end: '2026-11-18' }))
		];
		const entries = playedOn(events, day('2026-11-17'));
		expect(entries.map((e) => e.tournament.id)).toEqual([1, 3]);
		expect(entries[0].groups.map((g) => g.id)).toEqual([10]);
	});
});

describe('datedDays, the tournament-dates mode', () => {
	it('spans a short tournament across all its dates, rounds or not', () => {
		const event = datedDays(
			tournament({ start: '2026-11-20', end: '2026-11-22' }, [
				{ groups: [{ id: 10, rounds: ['2026-11-21'] }, { id: 11 }] }
			])
		);
		expect([...event.days.keys()]).toEqual([
			day('2026-11-20'),
			day('2026-11-21'),
			day('2026-11-22')
		]);
		// Every group on every day, so a click lists them all.
		expect(groupIds(event, '2026-11-20')).toEqual([10, 11]);
		expect(event.marker).toBe(false);
	});

	it('marks a longer tournament on its start day only, whatever its rounds say', () => {
		const event = datedDays(tournament({}, [{ groups: [{ id: 10, rounds: ['2026-11-17'] }] }]));
		expect([...event.days.keys()]).toEqual([day('2026-09-01')]);
		expect(event.marker).toBe(true);
	});

	it('marks a Grand Prix series on its start day, as game days does', () => {
		const event = datedDays(
			tournament({ type: GRAND_PRIX, start: '2026-11-20', end: '2026-11-21' })
		);
		expect([...event.days.keys()]).toEqual([day('2026-11-20')]);
		expect(event.marker).toBe(true);
	});
});
