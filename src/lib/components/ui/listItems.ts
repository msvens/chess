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
