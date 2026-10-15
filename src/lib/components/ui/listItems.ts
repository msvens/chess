/**
 * Density and filtering decisions shared by `SelectableList` and
 * `SearchableSelectableList`, as pure functions so they can be tested without
 * rendering.
 */
export type ListDensity = 'compact' | 'normal' | 'comfortable';

export interface ListDensityThresholds {
	/** At or below this item count, use comfortable. */
	comfortable: number;
	/** At or below this, normal. Above it, compact. */
	normal: number;
}

export interface SelectableListItem {
	id: string | number;
	label: string;
	subtitle?: string;
	/** Native tooltip on the row. */
	tooltip?: string;
	/**
	 * A heading this item sits under, indented. Consecutive items sharing it
	 * form one group; the heading itself cannot be selected.
	 */
	group?: string;
}

/** A run of consecutive items: under one heading, or ungrouped. */
export interface ListRun<T extends SelectableListItem> {
	group?: string;
	items: T[];
}

/**
 * Split a list into runs of consecutive items with the same `group`, so each
 * group renders once under its heading. A list without groups is one run.
 */
export function groupRuns<T extends SelectableListItem>(items: readonly T[]): ListRun<T>[] {
	const runs: ListRun<T>[] = [];
	for (const item of items) {
		const last = runs.at(-1);
		if (last && last.group === item.group) last.items.push(item);
		else runs.push({ group: item.group, items: [item] });
	}
	return runs;
}

export const DEFAULT_LIST_THRESHOLDS: ListDensityThresholds = { comfortable: 10, normal: 20 };

export function resolveListDensity(
	explicit: ListDensity | undefined,
	isMobile: boolean,
	itemCount: number,
	thresholds: ListDensityThresholds = DEFAULT_LIST_THRESHOLDS
): ListDensity {
	if (explicit) return explicit;
	if (isMobile) return 'compact';
	if (itemCount <= thresholds.comfortable) return 'comfortable';
	if (itemCount <= thresholds.normal) return 'normal';
	return 'compact';
}

/** Case-insensitive match on label or subtitle. Blank filter means everything. */
export function filterItems<T extends SelectableListItem>(items: T[], filter: string): T[] {
	const needle = filter.trim().toLowerCase();
	if (!needle) return items;
	return items.filter(
		(item) =>
			item.label.toLowerCase().includes(needle) || item.subtitle?.toLowerCase().includes(needle)
	);
}
