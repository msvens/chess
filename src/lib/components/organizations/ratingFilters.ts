/**
 * Values and option lists for `RatingFilters`. Pure, so the option building and
 * the date round-trip can be tested without rendering.
 */
import { PlayerCategory, RatingType } from '$lib/api';
import type { getTranslation } from '$lib/translations';
import type { SelectableListItem } from '$lib/components/ui/listItems';

export interface RatingFiltersValue {
	ratingDate: Date;
	ratingType: RatingType;
	memberType: PlayerCategory;
}

/** YYYY-MM-DD in the local timezone — the id used by the date dropdown. */
export function formatDateLocal(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD id back to local midnight.
 *
 * Not `new Date(str)`, which the spec parses as UTC — harmless at UTC+1/+2 but
 * asymmetric with `formatDateLocal` above, and wrong in any negative offset.
 */
export function parseDateLocal(value: string): Date {
	const [year, month, day] = value.split('-').map(Number);
	return new Date(year, month - 1, day);
}

export function getDefaultRatingFilters(): RatingFiltersValue {
	const now = new Date();
	return {
		// Rating lists are published monthly, so the first of the month is the
		// meaningful granularity.
		ratingDate: new Date(now.getFullYear(), now.getMonth(), 1),
		ratingType: RatingType.STANDARD,
		memberType: PlayerCategory.ALL
	};
}

type T = ReturnType<typeof getTranslation>;

export function ratingTypeItems(t: T): SelectableListItem[] {
	const r = t.pages.organizations.ratingList;
	return [
		{ id: RatingType.STANDARD, label: r.standard },
		{ id: RatingType.RAPID, label: r.rapid },
		{ id: RatingType.BLITZ, label: r.blitz }
	];
}

export function memberTypeItems(t: T): SelectableListItem[] {
	const m = t.pages.organizations.ratingList.memberTypes;
	return [
		{ id: PlayerCategory.ALL, label: m.all },
		{ id: PlayerCategory.WOMEN, label: m.women },
		{ id: PlayerCategory.JUNIORS, label: m.juniors },
		{ id: PlayerCategory.CADETS, label: m.cadets },
		{ id: PlayerCategory.MINORS, label: m.minors },
		{ id: PlayerCategory.KIDS, label: m.kids },
		{ id: PlayerCategory.VETERANS, label: m.veterans },
		{ id: PlayerCategory.Y2C_ELEMENTARY, label: m.y2cElementary },
		{ id: PlayerCategory.Y2C_GRADE5, label: m.y2cGrade5 },
		{ id: PlayerCategory.Y2C_GRADE6, label: m.y2cGrade6 },
		{ id: PlayerCategory.Y2C_MIDDLE_SCHOOL, label: m.y2cMiddleSchool }
	];
}

/** The last `monthsToShow` months, newest first, as YYYY-MM-DD ids. */
export function dateItems(monthsToShow = 12, now = new Date()): SelectableListItem[] {
	return Array.from({ length: monthsToShow }, (_, i) => {
		const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const id = formatDateLocal(date);
		return { id, label: id };
	});
}
