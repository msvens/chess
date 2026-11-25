import { describe, it, expect } from 'vitest';
import { TournamentType, TournamentState } from '@msvens/schack-se-sdk';
import type { TournamentDto } from '@msvens/schack-se-sdk';
import {
	toDayNumber,
	parseEventDays,
	buildMonthMatrix,
	buildWeekCells,
	packRow,
	buildDayRow,
	buildWeekRow,
	getEventDateBounds
} from '$lib/utils/calendarLayout';
import { datedDays, playedDays, type CalendarEvent } from '$lib/utils/playedDays';

/** Minimal mock — only the fields the layout functions inspect. */
function makeTournament(overrides: Partial<TournamentDto>): TournamentDto {
	return {
		id: 1,
		name: 'Test',
		start: '2024-01-01',
		end: '2024-01-01',
		city: '',
		arena: '',
		type: TournamentType.INDIVIDUAL,
		state: TournamentState.FINISHED,
		ia: 0,
		secjudges: '',
		thinkingTime: '',
		allowForeignPlayers: 0,
		teamtournamentPlayerListType: 0,
		ageFilter: 0,
		nrOfPartLink: '',
		orgType: 0,
		orgNumber: 0,
		ratingRegDate: '',
		ratingRegDate2: '',
		fideregged: 0,
		online: 0,
		y2cRules: 0,
		teamNrOfDaysRegged: 0,
		showPublic: 1,
		invitationurl: '',
		secParsedJudges: [],
		rootClasses: [],
		...overrides
	} as TournamentDto;
}

/**
 * A tournament as the layout sees it. Without groups it falls back on its own
 * dates (see `playedDays`), which is what most of these cases exercise.
 */
const ev = (overrides: Partial<TournamentDto>): CalendarEvent =>
	playedDays(makeTournament(overrides));

/** One class of groups, each playing on its round dates. */
function league(overrides: Partial<TournamentDto>, groups: [id: number, rounds: string[]][]) {
	const rootClasses = [
		{
			classID: 1,
			className: 'Klass',
			subClasses: [],
			groups: groups.map(([id, rounds]) => ({
				id,
				name: `Grupp ${id}`,
				start: '',
				end: '',
				tournamentRounds: rounds.map((roundDate, i) => ({ roundNumber: i + 1, roundDate }))
			}))
		}
	] as unknown as TournamentDto['rootClasses'];
	return ev({ start: '2024-06-01', end: '2024-06-30', ...overrides, rootClasses });
}

// Anchor inside a known week. 2024-06-12 is a Wednesday;
// its Mon–Sun week is 2024-06-10 .. 2024-06-16.
const WEEK_ANCHOR = new Date(2024, 5, 12);

describe('parseEventDays', () => {
	it('returns null when start is missing', () => {
		expect(parseEventDays(makeTournament({ start: '' }))).toBeNull();
	});

	it('treats empty end as single day', () => {
		const ev = parseEventDays(makeTournament({ start: '2024-06-10', end: '' }));
		expect(ev).not.toBeNull();
		expect(ev!.start).toBe(ev!.end);
	});

	it('clamps end before start', () => {
		const ev = parseEventDays(makeTournament({ start: '2024-06-10', end: '2024-06-08' }))!;
		expect(ev.end).toBe(ev.start);
	});

	it('computes inclusive span', () => {
		const ev = parseEventDays(makeTournament({ start: '2024-06-10', end: '2024-06-12' }))!;
		expect(ev.end - ev.start + 1).toBe(3);
	});
});

describe('buildMonthMatrix / buildWeekCells', () => {
	it('builds a Monday-first 6x7 grid', () => {
		const matrix = buildMonthMatrix(WEEK_ANCHOR, toDayNumber(WEEK_ANCHOR));
		expect(matrix).toHaveLength(6);
		expect(matrix.every((r) => r.length === 7)).toBe(true);
		// June 2024 starts on a Saturday → first cell is Mon 2024-05-27.
		expect(matrix[0][0].date.getDate()).toBe(27);
		expect(matrix[0][0].inCurrentMonth).toBe(false);
	});

	it('builds a Mon–Sun week', () => {
		const cells = buildWeekCells(WEEK_ANCHOR, toDayNumber(WEEK_ANCHOR));
		expect(cells).toHaveLength(7);
		expect(cells[0].date.getDate()).toBe(10); // Monday
		expect(cells[6].date.getDate()).toBe(16); // Sunday
	});

	it('flags today', () => {
		const today = toDayNumber(WEEK_ANCHOR);
		const cells = buildWeekCells(WEEK_ANCHOR, today);
		expect(cells.filter((c) => c.isToday)).toHaveLength(1);
		expect(cells.find((c) => c.isToday)!.date.getDate()).toBe(12);
	});
});

describe('packRow — single week row 2024-06-10..16', () => {
	const cells = buildWeekCells(WEEK_ANCHOR, toDayNumber(WEEK_ANCHOR));

	it('positions a single-day event in the right column', () => {
		const row = packRow(cells, [ev({ start: '2024-06-12', end: '2024-06-12' })]);
		expect(row.segments).toHaveLength(1);
		expect(row.segments[0]).toMatchObject({
			colOffset: 2,
			colSpan: 1,
			continuesLeft: false,
			continuesRight: false
		});
	});

	it('spans a multi-day event within the week', () => {
		const row = packRow(cells, [ev({ start: '2024-06-11', end: '2024-06-13' })]);
		expect(row.segments[0]).toMatchObject({
			colOffset: 1,
			colSpan: 3,
			continuesLeft: false,
			continuesRight: false
		});
	});

	it('clips an event that started before this row and flags continuesLeft', () => {
		const row = packRow(cells, [ev({ start: '2024-06-08', end: '2024-06-11' })]);
		expect(row.segments[0]).toMatchObject({
			colOffset: 0,
			colSpan: 2,
			continuesLeft: true,
			continuesRight: false
		});
	});

	it('clips an event that runs past this row and flags continuesRight', () => {
		// 5-day event Sat 15 → Wed 19: in this row only 15,16 are visible (cols 5,6).
		const row = packRow(cells, [ev({ start: '2024-06-15', end: '2024-06-19' })]);
		expect(row.segments[0]).toMatchObject({
			colOffset: 5,
			colSpan: 2,
			continuesLeft: false,
			continuesRight: true
		});
	});

	it('marks a >7-day event with no round dates on its start day only', () => {
		const row = packRow(cells, [ev({ start: '2024-06-11', end: '2024-06-30' })]);
		expect(row.segments).toHaveLength(1);
		expect(row.segments[0]).toMatchObject({ marker: 'start', colOffset: 1, colSpan: 1 });
	});

	it('does not show such an event on a non-start row', () => {
		// Long event whose start is in a previous week → nothing in this row.
		const row = packRow(cells, [ev({ start: '2024-06-01', end: '2024-06-30' })]);
		expect(row.segments).toHaveLength(0);
	});

	it('lane-packs overlapping events onto separate lanes', () => {
		const row = packRow(cells, [
			ev({ id: 1, start: '2024-06-10', end: '2024-06-12' }),
			ev({ id: 2, start: '2024-06-11', end: '2024-06-13' }),
			ev({ id: 3, start: '2024-06-15', end: '2024-06-16' })
		]);
		const lane = (id: number) => row.segments.find((seg) => seg.tournament.id === id)!.laneIndex;
		expect(lane(1)).toBe(0);
		expect(lane(2)).toBe(1); // overlaps #1 → new lane
		expect(lane(3)).toBe(0); // no overlap with #1 → reuses lane 0
		expect(row.maxLanes).toBe(2);
	});
});

describe('week-boundary split (the critical case)', () => {
	it('splits a 4-day event straddling Sun→Mon into two segments', () => {
		// Fri 2024-06-14 → Mon 2024-06-17. Week A: 10..16, Week B: 17..23.
		const t = ev({ start: '2024-06-14', end: '2024-06-17' });
		const today = toDayNumber(WEEK_ANCHOR);

		const rowA = packRow(buildWeekCells(new Date(2024, 5, 12), today), [t]);
		const rowB = packRow(buildWeekCells(new Date(2024, 5, 19), today), [t]);

		// Week A: Fri,Sat,Sun = cols 4,5,6, continues into next week.
		expect(rowA.segments[0]).toMatchObject({
			colOffset: 4,
			colSpan: 3,
			continuesLeft: false,
			continuesRight: true
		});
		// Week B: Mon = col 0, continued from previous week.
		expect(rowB.segments[0]).toMatchObject({
			colOffset: 0,
			colSpan: 1,
			continuesLeft: true,
			continuesRight: false
		});
	});
});

describe('buildWeekRow', () => {
	const today = toDayNumber(WEEK_ANCHOR);

	it('packs the anchor week into one row', () => {
		const row = buildWeekRow(WEEK_ANCHOR, [ev({ start: '2024-06-12', end: '2024-06-12' })], today);
		expect(row.cells).toHaveLength(7);
		expect(row.cells[0].date.getDate()).toBe(10); // Mon 2024-06-10
		expect(row.segments).toHaveLength(1);
		expect(row.segments[0]).toMatchObject({ colOffset: 2, colSpan: 1 });
	});

	it('agrees with packRow(buildWeekCells(...)), which it composes', () => {
		const tournaments = [ev({ start: '2024-06-11', end: '2024-06-13' })];
		const viaHelper = buildWeekRow(WEEK_ANCHOR, tournaments, today);
		const viaParts = packRow(buildWeekCells(WEEK_ANCHOR, today), tournaments);
		expect(viaHelper.segments).toEqual(viaParts.segments);
	});

	it('flags an event running past the end of the week', () => {
		const row = buildWeekRow(WEEK_ANCHOR, [ev({ start: '2024-06-14', end: '2024-06-20' })], today);
		expect(row.segments[0].continuesRight).toBe(true);
	});
});

describe('buildDayRow', () => {
	const today = toDayNumber(WEEK_ANCHOR);

	it('is one cell, the anchor day', () => {
		const row = buildDayRow(WEEK_ANCHOR, [], today);
		expect(row.cells).toHaveLength(1);
		expect(row.cells[0]).toMatchObject({ dayNumber: today, isToday: true });
	});

	it('says whether an event runs on from the day before and into the next', () => {
		const row = buildDayRow(WEEK_ANCHOR, [ev({ start: '2024-06-11', end: '2024-06-13' })], today);
		expect(row.segments[0]).toMatchObject({ continuesLeft: true, continuesRight: true });
	});

	it('leaves out what is not played that day', () => {
		const row = buildDayRow(WEEK_ANCHOR, [league({}, [[10, ['2024-06-11', '2024-06-13']]])], today);
		expect(row.segments).toEqual([]);
	});
});

describe('a tournament on the days it is played', () => {
	const cells = buildWeekCells(WEEK_ANCHOR, toDayNumber(WEEK_ANCHOR));

	it('puts a weekly league on each evening it plays, not on its start date', () => {
		// Started 1 June; plays Tuesday 11th and Thursday 13th this week.
		const row = packRow(cells, [league({}, [[10, ['2024-06-04', '2024-06-11', '2024-06-13']]])]);
		expect(row.segments.map((seg) => [seg.colOffset, seg.colSpan])).toEqual([
			[1, 1],
			[3, 1]
		]);
		expect(row.segments.every((seg) => !seg.marker)).toBe(true);
	});

	it('draws consecutive days as one bar', () => {
		const row = packRow(cells, [league({}, [[10, ['2024-06-15', '2024-06-16']]])]);
		expect(row.segments).toHaveLength(1);
		expect(row.segments[0]).toMatchObject({ colOffset: 5, colSpan: 2 });
	});

	it('carries the groups playing on the bar’s days', () => {
		const row = packRow(cells, [
			league({}, [
				[10, ['2024-06-15']],
				[11, ['2024-06-16']],
				[12, ['2024-06-11']]
			])
		]);
		const weekend = row.segments.find((seg) => seg.colOffset === 5)!;
		expect(weekend.groups.map((g) => g.id)).toEqual([10, 11]);
		const tuesday = row.segments.find((seg) => seg.colOffset === 1)!;
		expect(tuesday.groups.map((g) => g.id)).toEqual([12]);
	});

	it('flags a run that crosses into the next or previous week', () => {
		const event = league({}, [[10, ['2024-06-16', '2024-06-17']]]);
		const today = toDayNumber(WEEK_ANCHOR);
		const thisWeek = packRow(buildWeekCells(new Date(2024, 5, 12), today), [event]);
		const nextWeek = packRow(buildWeekCells(new Date(2024, 5, 19), today), [event]);
		expect(thisWeek.segments[0]).toMatchObject({ colOffset: 6, continuesRight: true });
		expect(nextWeek.segments[0]).toMatchObject({ colOffset: 0, continuesLeft: true });
	});

	it('does not join a chip to a round in the next week that is not the next day', () => {
		const event = league({}, [[10, ['2024-06-16', '2024-06-18']]]);
		const row = packRow(cells, [event]);
		expect(row.segments[0]).toMatchObject({ colOffset: 6, continuesRight: false });
	});
});

describe('getEventDateBounds', () => {
	it('returns null for an empty set', () => {
		expect(getEventDateBounds([])).toBeNull();
	});

	it('spans the first and last day anything is on the calendar', () => {
		const bounds = getEventDateBounds([
			ev({ start: '2024-06-20', end: '2024-06-20' }),
			ev({ start: '2024-06-05', end: '2024-06-05' })
		])!;
		expect(bounds.earliest).toEqual(new Date(2024, 5, 5));
		expect(bounds.latest).toEqual(new Date(2024, 5, 20));
	});

	it('reaches a long league’s start and end markers, not only its rounds', () => {
		const bounds = getEventDateBounds([
			league({ start: '2024-05-01', end: '2024-07-31' }, [[10, ['2024-06-12', '2024-07-09']]])
		])!;
		expect(bounds.earliest).toEqual(new Date(2024, 4, 1));
		expect(bounds.latest).toEqual(new Date(2024, 6, 31));
	});
});

describe('start and end markers', () => {
	const cells = buildWeekCells(WEEK_ANCHOR, toDayNumber(WEEK_ANCHOR));

	it('marks a long tournament’s start and end as separate markers', () => {
		// 2024-05-01 – 2024-06-13, in tournament-dates mode: the end falls on Thursday.
		const row = packRow(cells, [
			datedDays(makeTournament({ start: '2024-05-01', end: '2024-06-13' }))
		]);
		expect(row.segments).toHaveLength(1);
		expect(row.segments[0]).toMatchObject({ marker: 'end', colOffset: 3, colSpan: 1 });
	});

	it('never joins a start and an end on consecutive days into a bar', () => {
		const series = datedDays(
			makeTournament({ type: TournamentType.GRAND_PRIX, start: '2024-06-12', end: '2024-06-13' })
		);
		const row = packRow(cells, [series]);
		expect(row.segments.map((seg) => [seg.colOffset, seg.colSpan, seg.marker])).toEqual([
			[2, 1, 'start'],
			[3, 1, 'end']
		]);
	});
});
