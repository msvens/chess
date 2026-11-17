/**
 * Pure date-math + event layout helpers for the calendar week/month views.
 *
 * No React, no i18n — just data transformation so it stays easy to reason about
 * and test. All date parsing goes through `parseLocalDate` (local midnight) and
 * all span math is done on integer "day numbers" to avoid DST/UTC off-by-one
 * bugs (see the project memory note on `value && ...` and date pitfalls).
 */
import { parseLocalDate, type TournamentDto } from '$lib/api';
import type { CalendarEvent, Group } from './playedDays';

/** Max lanes (stacked bars) rendered per day cell in month view before "+N more". */
export const MONTH_MAX_LANES = 3;

export interface DayCell {
	/** Local-midnight Date for this day. */
	date: Date;
	/** Stable integer day number (UTC-epoch based, DST-safe). */
	dayNumber: number;
	/** True when this cell belongs to the anchor month (false for padded days). */
	inCurrentMonth: boolean;
	/** True when this cell is today. */
	isToday: boolean;
}

export interface PositionedSegment {
	tournament: TournamentDto;
	/** 0-based column within the row (0 = first day of the row). */
	colOffset: number;
	/** Number of columns the bar spans within this row. */
	colSpan: number;
	/** Vertical lane (0-based) for stacking overlapping bars. */
	laneIndex: number;
	/** Bar continues into the previous row (render a ◀ hint). */
	continuesLeft: boolean;
	/** Bar continues into the next row (render a ▶ hint). */
	continuesRight: boolean;
	/** A marker on a tournament's start or end day, not a claim of play: see `playedDays`. */
	marker: 'start' | 'end' | null;
	/** The groups playing on the segment's days, in class order. */
	groups: Group[];
}

export interface PackedRow {
	/** The 7 day cells of this row (Mon–Sun). */
	cells: DayCell[];
	/** Positioned + lane-packed segments visible in this row. */
	segments: PositionedSegment[];
	/** Number of lanes used — drives the row's min-height. */
	maxLanes: number;
}

/**
 * Convert a Date to a stable integer day number based on its calendar
 * Y/M/D (timezone/DST independent). Two dates with the same calendar day
 * always produce the same number.
 */
export function toDayNumber(date: Date): number {
	return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/** The local-midnight Date for a day number; the inverse of `toDayNumber`. */
export function fromDayNumber(dayNumber: number): Date {
	const utc = new Date(dayNumber * 86_400_000);
	return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

/** Add `n` days to a date (DST-safe — uses calendar arithmetic). */
export function addDays(date: Date, n: number): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

/** Add `n` months to a date, anchored to the 1st. */
export function addMonths(date: Date, n: number): Date {
	return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

/** Monday-based day-of-week index: Mon=0 … Sun=6. */
function mondayIndex(date: Date): number {
	return (date.getDay() + 6) % 7;
}

/**
 * Parse a tournament's start/end into inclusive day numbers.
 * Returns null when there's no usable start date. Guards empty `end`
 * (single-day) and clamps a malformed `end < start`.
 */
export function parseEventDays(t: TournamentDto): { start: number; end: number } | null {
	if (!t.start) return null;
	const start = toDayNumber(parseLocalDate(t.start));
	let end = start;
	if (t.end) {
		end = toDayNumber(parseLocalDate(t.end));
		if (end < start) end = start;
	}
	return { start, end };
}

function makeCell(date: Date, anchorMonth: number, todayDayNumber: number): DayCell {
	const dayNumber = toDayNumber(date);
	return {
		date,
		dayNumber,
		inCurrentMonth: date.getMonth() === anchorMonth,
		isToday: dayNumber === todayDayNumber
	};
}

/**
 * Build a Monday-first 6×7 month matrix for the month containing `anchor`,
 * padded with adjacent-month days.
 */
export function buildMonthMatrix(anchor: Date, todayDayNumber: number): DayCell[][] {
	const year = anchor.getFullYear();
	const month = anchor.getMonth();
	const offset = mondayIndex(new Date(year, month, 1));

	const rows: DayCell[][] = [];
	for (let row = 0; row < 6; row++) {
		const cells: DayCell[] = [];
		for (let col = 0; col < 7; col++) {
			const dayOfMonth = 1 - offset + row * 7 + col;
			cells.push(makeCell(new Date(year, month, dayOfMonth), month, todayDayNumber));
		}
		rows.push(cells);
	}
	return rows;
}

/** Build the 7 Mon–Sun cells of the week containing `anchor`. */
export function buildWeekCells(anchor: Date, todayDayNumber: number): DayCell[] {
	const offset = mondayIndex(anchor);
	const cells: DayCell[] = [];
	for (let i = 0; i < 7; i++) {
		const date = addDays(anchor, -offset + i);
		cells.push(makeCell(date, date.getMonth(), todayDayNumber));
	}
	return cells;
}

/**
 * Position + lane-pack a single contiguous row of day cells.
 *
 * A tournament is drawn on the days it is played (`playedDays`): each run of
 * consecutive played days in this row becomes one bar, so a weekend open is a
 * bar and a weekly league is a chip on each evening it plays. Overlapping
 * segments are greedily assigned to lanes (left-to-right by start column) so
 * they stack vertically.
 */
export function packRow(cells: DayCell[], events: CalendarEvent[]): PackedRow {
	const rowStart = cells[0].dayNumber;
	const rowEnd = cells[cells.length - 1].dayNumber;

	const segments: PositionedSegment[] = [];
	for (const { tournament, days, marker, endDay } of events) {
		const inRow = [...days.keys()]
			.filter((d) => d >= rowStart && d <= rowEnd)
			.sort((a, b) => a - b);

		// Markers stand alone: a short series' start and end must not merge into a bar.
		if (marker) {
			for (const day of inRow) {
				segments.push({
					tournament,
					colOffset: day - rowStart,
					colSpan: 1,
					laneIndex: 0,
					continuesLeft: false,
					continuesRight: false,
					marker: day === endDay ? 'end' : 'start',
					groups: days.get(day) ?? []
				});
			}
			continue;
		}

		let runStart = 0;
		for (let i = 0; i < inRow.length; i++) {
			// Close the run at the last day, or where the next day is not the one after.
			if (i < inRow.length - 1 && inRow[i + 1] === inRow[i] + 1) continue;
			const first = inRow[runStart];
			const last = inRow[i];
			const groups = [...new Set(inRow.slice(runStart, i + 1).flatMap((d) => days.get(d) ?? []))];
			segments.push({
				tournament,
				colOffset: first - rowStart,
				colSpan: last - first + 1,
				laneIndex: 0,
				continuesLeft: first === rowStart && days.has(rowStart - 1),
				continuesRight: last === rowEnd && days.has(rowEnd + 1),
				marker: null,
				groups
			});
			runStart = i + 1;
		}
	}

	// Greedy lane packing: sort by start column, longer spans first on ties.
	segments.sort((a, b) => a.colOffset - b.colOffset || b.colSpan - a.colSpan);
	const laneEndCol: number[] = []; // last occupied column per lane
	for (const seg of segments) {
		const endCol = seg.colOffset + seg.colSpan - 1;
		let placed = false;
		for (let lane = 0; lane < laneEndCol.length; lane++) {
			if (laneEndCol[lane] < seg.colOffset) {
				seg.laneIndex = lane;
				laneEndCol[lane] = endCol;
				placed = true;
				break;
			}
		}
		if (!placed) {
			seg.laneIndex = laneEndCol.length;
			laneEndCol.push(endCol);
		}
	}

	return { cells, segments, maxLanes: laneEndCol.length };
}

/** Build all 6 packed rows for a month view. */
export function buildMonthRows(
	anchor: Date,
	events: CalendarEvent[],
	todayDayNumber: number
): PackedRow[] {
	return buildMonthMatrix(anchor, todayDayNumber).map((cells) => packRow(cells, events));
}

/** Build the single packed row for a week view. */
export function buildWeekRow(
	anchor: Date,
	events: CalendarEvent[],
	todayDayNumber: number
): PackedRow {
	return packRow(buildWeekCells(anchor, todayDayNumber), events);
}

/**
 * The first and last day anything is played, as local-midnight Dates. Used to
 * bound navigation and to jump to the first or last event — so a league that
 * started in September but plays into May lets you page to May.
 */
export function getEventDateBounds(
	events: CalendarEvent[]
): { earliest: Date; latest: Date } | null {
	let min: number | null = null;
	let max: number | null = null;
	for (const { days } of events) {
		for (const day of days.keys()) {
			if (min === null || day < min) min = day;
			if (max === null || day > max) max = day;
		}
	}
	if (min === null || max === null) return null;
	return { earliest: fromDayNumber(min), latest: fromDayNumber(max) };
}
