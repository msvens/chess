/**
 * Column and prop types for `Table.svelte`.
 *
 * Kept out of the component so column definitions can be built and unit-tested
 * without rendering, which is how most of the interesting logic (sort values,
 * formatting) gets covered.
 */
import type { Snippet } from 'svelte';

export type TableAlign = 'left' | 'center' | 'right';
export type TableDensity = 'compact' | 'normal' | 'comfortable';

export interface TableColumn<T> {
	/** Stable identity for keying and for the sort state. */
	id: string;

	/** Header text. 86 of the Next app's 87 columns are a plain string. */
	header?: string;
	/**
	 * Escape hatch for a header needing markup. Wins over `header`.
	 *
	 * Receives its own column, so one snippet can serve a set of columns built in
	 * a loop — the JGP standings number their tournament columns and link each to
	 * its results page, and look the tournament up by column id.
	 */
	headerSnippet?: Snippet<[TableColumn<T>]>;

	/**
	 * Where the cell's value comes from: a property name, or a function of the row.
	 * Covers ~79% of columns, which return a plain scalar.
	 */
	accessor?: keyof T | ((row: T) => unknown);
	/**
	 * For cells that need markup — a link, a badge, conditional styling.
	 * React could return JSX straight from `accessor`; Svelte cannot, so those
	 * columns declare a snippet instead. Wins over `accessor`.
	 */
	cell?: Snippet<[T]>;

	align?: TableAlign;
	/** Pins the column while the table scrolls horizontally. */
	sticky?: 'left' | 'right';
	noWrap?: boolean;
	/** CSS width, e.g. '28%'. */
	width?: string;
	headerClassName?: string;
	cellClassName?: string;

	/**
	 * Makes the column sortable by extracting a comparable value.
	 * Presence of this is what marks a column sortable.
	 */
	sortValue?: (row: T) => string | number;
}

export interface PaginationLabels {
	showing: string;
	of: string;
	itemName?: string;
}

export interface PaginationConfig {
	/** Rows per page (default 50). */
	pageSize?: number;
	/** Labels for the info line. Without them it reads "1-50 / 3334". */
	labels?: PaginationLabels;
	/** Show the info line above the table (default true). */
	showInfo?: boolean;
}

export interface DensityThresholds {
	/** At or below this row count, use comfortable. */
	comfortable: number;
	/** At or below this, normal. Above it, compact. */
	normal: number;
}

export interface TableSort {
	columnId: string;
	direction: 'asc' | 'desc';
}
