/**
 * Sorting, paging and density decisions for `Table.svelte`, as pure functions.
 *
 * Split out deliberately: this is where the behaviour that can be quietly wrong
 * lives, and it is far easier to pin down with plain unit tests than by driving
 * a rendered table.
 */
import type { DensityThresholds, TableColumn, TableDensity, TableSort } from './tableTypes';

/** Header click cycle: unsorted → asc → desc → unsorted. */
export function nextSort(current: TableSort | null, columnId: string): TableSort | null {
	if (current?.columnId !== columnId) return { columnId, direction: 'asc' };
	if (current.direction === 'asc') return { columnId, direction: 'desc' };
	return null;
}

export function sortRows<T>(rows: T[], columns: TableColumn<T>[], sort: TableSort | null): T[] {
	if (!sort) return rows;
	const column = columns.find((c) => c.id === sort.columnId);
	if (!column?.sortValue) return rows;
	const get = column.sortValue;
	// Copy before sorting — the caller's array is not ours to reorder.
	return [...rows].sort((a, b) => {
		const av = get(a);
		const bv = get(b);
		if (av < bv) return sort.direction === 'asc' ? -1 : 1;
		if (av > bv) return sort.direction === 'asc' ? 1 : -1;
		return 0;
	});
}

export function pageCount(totalRows: number, pageSize: number): number {
	return Math.max(1, Math.ceil(totalRows / pageSize));
}

/**
 * The page actually shown, clamped into range.
 *
 * This replaces the React version's reset-on-`data`-reference-change, which was a
 * render-phase state adjustment keyed on the ARRAY IDENTITY of `data`. Any caller
 * that rebuilt its rows inline — the common case, since most are derived — silently
 * bounced the user back to page 1 on every unrelated re-render. Clamping instead is
 * both correct and identity-free: shrinking data lands you on the last real page
 * rather than an empty one, and stable data leaves the page alone.
 */
export function clampPage(page: number, totalRows: number, pageSize: number): number {
	return Math.min(Math.max(1, page), pageCount(totalRows, pageSize));
}

export function pageSlice<T>(rows: T[], page: number, pageSize: number): T[] {
	const start = (clampPage(page, rows.length, pageSize) - 1) * pageSize;
	return rows.slice(start, start + pageSize);
}

/** "1-50 / 3334", or the labelled form when labels are supplied. */
export function paginationInfo(
	page: number,
	totalRows: number,
	pageSize: number,
	labels?: { showing: string; of: string; itemName?: string }
): string | null {
	if (totalRows === 0) return null;
	const safe = clampPage(page, totalRows, pageSize);
	const first = (safe - 1) * pageSize + 1;
	const last = Math.min(safe * pageSize, totalRows);
	if (labels) {
		const item = labels.itemName ? ` ${labels.itemName}` : '';
		return `${labels.showing} ${first}-${last} ${labels.of} ${totalRows}${item}`;
	}
	return `${first}-${last} / ${totalRows}`;
}

/**
 * Row height follows the amount on screen: a short table gets room to breathe, a
 * long one tightens up. Mobile is always compact.
 */
export function resolveDensity(
	explicit: TableDensity | undefined,
	isMobile: boolean,
	visibleRows: number,
	thresholds: DensityThresholds
): TableDensity {
	if (explicit) return explicit;
	if (isMobile) return 'compact';
	if (visibleRows <= thresholds.comfortable) return 'comfortable';
	if (visibleRows <= thresholds.normal) return 'normal';
	return 'compact';
}

/** Reads a cell's value. Null and undefined render as an em dash placeholder. */
export function cellValue<T>(row: T, column: TableColumn<T>): string {
	const raw =
		typeof column.accessor === 'function'
			? column.accessor(row)
			: column.accessor !== undefined
				? row[column.accessor]
				: undefined;
	if (raw === undefined || raw === null) return '-';
	return String(raw);
}
