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

const markerOf = (event: ReturnType<typeof playedDays>, iso: string) => event.markers.get(day(iso));

/*
 * The game-days rule itself is the SDK's (`getTournamentPlayDays`) and is tested
 * there. These check the adapter: dates become day numbers, groups come through
 * in order, and markers land on the right days.
 */
describe('playedDays, by the SDK’s rule', () => {
	it('puts a league on its round days, with the groups playing each', () => {
		const event = playedDays(
			tournament({ start: '2026-11-17', end: '2026-11-24' }, [
				{ groups: [{ id: 10, rounds: ['2026-11-17', '2026-11-24'] }] },
				{ groups: [{ id: 20, rounds: ['2026-11-24'] }] }
			])
		);
		expect(groupIds(event, '2026-11-17')).toEqual([10]);
		expect(groupIds(event, '2026-11-24')).toEqual([10, 20]);
		expect(event.markers.size).toBe(0);
	});

	it('marks a long league’s start and end when it does not play on them', () => {
		const event = playedDays(tournament({}, [{ groups: [{ id: 10, rounds: ['2026-11-17'] }] }]));
		expect([...event.days.keys()]).toEqual([
			day('2026-09-01'),
			day('2026-11-17'),
			day('2026-12-15')
		]);
		expect(markerOf(event, '2026-09-01')).toBe('start');
		expect(markerOf(event, '2026-11-17')).toBeUndefined();
		expect(markerOf(event, '2026-12-15')).toBe('end');
	});

	it('ignores a round dated after the tournament ends', () => {
		// Juniorallsvenskan 2026's div II, dated a day late by the organiser.
		const event = playedDays(
			tournament({ start: '2026-11-27', end: '2026-11-29' }, [
				{
					groups: [
						{ id: 10, rounds: ['2026-11-29', '2026-11-30'], start: '2026-11-28', end: '2026-11-30' }
					]
				}
			])
		);
		expect(event.days.has(day('2026-11-30'))).toBe(false);
		expect(groupIds(event, '2026-11-29')).toEqual([10]);
	});

	it('gives a Grand Prix series start and end markers, and no groups', () => {
		const event = playedDays(
			tournament({ type: GRAND_PRIX }, [{ groups: [{ id: 10, rounds: ['2026-11-17'] }] }])
		);
		expect([...event.days.keys()]).toEqual([day('2026-09-01'), day('2026-12-15')]);
		expect(groupIds(event, '2026-09-01')).toEqual([]);
		expect(markerOf(event, '2026-12-15')).toBe('end');
	});
});

describe('playedOn', () => {
	it('lists the tournaments on a day, each with its groups for that day', () => {
		const events = [
			playedDays(
				tournament({ id: 1, start: '2026-11-17', end: '2026-11-18' }, [
					{ groups: [{ id: 10, rounds: ['2026-11-17'] }] }
				])
			),
			playedDays(
				tournament({ id: 2, start: '2026-11-18', end: '2026-11-18' }, [
					{ groups: [{ id: 20, rounds: ['2026-11-18'] }] }
				])
			)
		];
		const entries = playedOn(events, day('2026-11-17'));
		expect(entries.map((e) => e.tournament.id)).toEqual([1]);
		expect(entries[0].groups.map((g) => g.id)).toEqual([10]);
	});

	it('says which day is only a start or an end', () => {
		const events = [playedDays(tournament({}, [{ groups: [{ id: 10, rounds: ['2026-11-17'] }] }]))];
		expect(playedOn(events, day('2026-09-01'))[0]).toMatchObject({ starts: true, ends: false });
		expect(playedOn(events, day('2026-11-17'))[0]).toMatchObject({ starts: false, ends: false });
		expect(playedOn(events, day('2026-12-15'))[0]).toMatchObject({ starts: false, ends: true });
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
		expect(event.markers.size).toBe(0);
	});

	it('marks a longer tournament on its start and end days, whatever its rounds say', () => {
		const event = datedDays(tournament({}, [{ groups: [{ id: 10, rounds: ['2026-11-17'] }] }]));
		expect([...event.days.keys()]).toEqual([day('2026-09-01'), day('2026-12-15')]);
		expect(markerOf(event, '2026-09-01')).toBe('start');
		expect(markerOf(event, '2026-12-15')).toBe('end');
	});

	it('marks a Grand Prix series on its start and end days', () => {
		const event = datedDays(
			tournament({ type: GRAND_PRIX, start: '2026-11-20', end: '2026-11-21' })
		);
		expect([...event.days.keys()]).toEqual([day('2026-11-20'), day('2026-11-21')]);
		expect(markerOf(event, '2026-11-21')).toBe('end');
	});

	it('has no end marker for a one-day series', () => {
		const event = datedDays(
			tournament({ type: GRAND_PRIX, start: '2026-11-20', end: '2026-11-20' })
		);
		expect([...event.days.keys()]).toEqual([day('2026-11-20')]);
		expect(markerOf(event, '2026-11-20')).toBe('start');
	});
});
