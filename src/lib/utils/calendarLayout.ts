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
import { byName } from './nameOrder';

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
 * bar and a weekly league is a chip on each evening it plays. A start or end
 * marker is always a segment of its own. Overlapping segments stack in lanes:
 * bars across several days first, then single days, each A–Z.
 */
export function packRow(cells: DayCell[], events: CalendarEvent[]): PackedRow {
	const rowStart = cells[0].dayNumber;
	const rowEnd = cells[cells.length - 1].dayNumber;

	const segments: PositionedSegment[] = [];
	for (const { tournament, days, markers } of events) {
		const inRow = [...days.keys()]
			.filter((d) => d >= rowStart && d <= rowEnd)
			.sort((a, b) => a - b);

		// Markers stand alone: a start or end marker never merges into a bar.
		for (const day of inRow) {
			const marker = markers.get(day);
			if (!marker) continue;
			segments.push({
				tournament,
				colOffset: day - rowStart,
				colSpan: 1,
				laneIndex: 0,
				continuesLeft: false,
				continuesRight: false,
				marker,
				groups: days.get(day) ?? []
			});
		}

		const isPlayed = (day: number) => days.has(day) && !markers.has(day);
		const played = inRow.filter(isPlayed);
		let runStart = 0;
		for (let i = 0; i < played.length; i++) {
			// Close the run at the last day, or where the next day is not the one after.
			if (i < played.length - 1 && played[i + 1] === played[i] + 1) continue;
			const first = played[runStart];
			const last = played[i];
			const groups = [...new Set(played.slice(runStart, i + 1).flatMap((d) => days.get(d) ?? []))];
			segments.push({
				tournament,
				colOffset: first - rowStart,
				colSpan: last - first + 1,
				laneIndex: 0,
				continuesLeft: first === rowStart && isPlayed(rowStart - 1),
				continuesRight: last === rowEnd && isPlayed(rowEnd + 1),
				marker: null,
				groups
			});
			runStart = i + 1;
		}
	}

	// Lanes are handed out in reading order: tournaments drawn across several
	// days first, then single days (league evenings, one-day events, markers),
	// each A–Z. A segment takes the topmost lane free on all its columns, so a
	// bar keeps one lane across the row and a day's single entries read A–Z
	// from the top. A single entry can take a free lane above a bar, on a day
	// that bar's lane-mates don't cover: compact rows beat a strict band.
	const spans = (seg: PositionedSegment) =>
		seg.colSpan > 1 || seg.continuesLeft || seg.continuesRight;
	segments.sort(
		(a, b) =>
			Number(spans(b)) - Number(spans(a)) ||
			byName(a.tournament, b.tournament) ||
			a.colOffset - b.colOffset
	);
	const taken: boolean[][] = []; // lane → column → occupied
	for (const seg of segments) {
		const columns = Array.from({ length: seg.colSpan }, (_, i) => seg.colOffset + i);
		let lane = 0;
		while (lane < taken.length && columns.some((col) => taken[lane][col])) lane++;
		if (lane === taken.length) taken.push(cells.map(() => false));
		for (const col of columns) taken[lane][col] = true;
		seg.laneIndex = lane;
	}

	return { cells, segments, maxLanes: taken.length };
}

/** Build all 6 packed rows for a month view. */
export function buildMonthRows(
	anchor: Date,
	events: CalendarEvent[],
	todayDayNumber: number
): PackedRow[] {
	return buildMonthMatrix(anchor, todayDayNumber).map((cells) => packRow(cells, events));
}

/**
 * One day as a row of one cell: a day's events as segments, so they keep
 * whether they continue from the day before or into the next, their marker and
 * their groups.
 */
export function buildDayRow(
	anchor: Date,
	events: CalendarEvent[],
	todayDayNumber: number
): PackedRow {
	return packRow([makeCell(anchor, anchor.getMonth(), todayDayNumber)], events);
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
 * The first and last day anything is on the calendar (a day of play or a start
 * or end marker), as local-midnight Dates. Used to bound navigation and to jump
 * to the first or last event — so a league running September to May lets you
 * page from its start to its end.
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
