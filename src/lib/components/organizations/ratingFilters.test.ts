import { describe, expect, it } from 'vitest';
import { PlayerCategory, RatingType } from '$lib/api';
import { getTranslation } from '$lib/translations';
import {
	dateItems,
	formatDateLocal,
	getDefaultRatingFilters,
	memberTypeItems,
	parseDateLocal,
	ratingTypeItems
} from './ratingFilters';

describe('date round-trip', () => {
	it('formats to YYYY-MM-DD in local time', () => {
		expect(formatDateLocal(new Date(2026, 7, 1))).toBe('2026-08-01');
		expect(formatDateLocal(new Date(2026, 11, 25))).toBe('2026-12-25');
	});

	// The React version formatted locally but parsed with `new Date(str)`, which the
	// spec treats as UTC. Harmless at UTC+1/+2, wrong in any negative offset — and
	// asymmetric either way. These two must be exact inverses.
	it('parses back to the same local date it formatted', () => {
		for (const d of [new Date(2026, 0, 1), new Date(2026, 7, 1), new Date(2026, 11, 31)]) {
			const round = parseDateLocal(formatDateLocal(d));
			expect(round.getFullYear()).toBe(d.getFullYear());
			expect(round.getMonth()).toBe(d.getMonth());
			expect(round.getDate()).toBe(d.getDate());
		}
	});

	it('parses to local midnight, not UTC midnight', () => {
		const parsed = parseDateLocal('2026-08-01');
		expect(parsed.getHours()).toBe(0);
		expect(parsed.getDate()).toBe(1);
	});
});

describe('getDefaultRatingFilters', () => {
	it('starts on the first of the current month, standard, all members', () => {
		const f = getDefaultRatingFilters();
		expect(f.ratingDate.getDate()).toBe(1);
		expect(f.ratingType).toBe(RatingType.STANDARD);
		expect(f.memberType).toBe(PlayerCategory.ALL);
	});
});

describe('dateItems', () => {
	it('lists the requested number of months, newest first', () => {
		const items = dateItems(3, new Date(2026, 7, 15));
		expect(items.map((i) => i.id)).toEqual(['2026-08-01', '2026-07-01', '2026-06-01']);
	});

	it('rolls back over a year boundary', () => {
		const items = dateItems(3, new Date(2026, 1, 10));
		expect(items.map((i) => i.id)).toEqual(['2026-02-01', '2026-01-01', '2025-12-01']);
	});

	it('always lands on the first of the month, since lists are monthly', () => {
		for (const item of dateItems(12, new Date(2026, 7, 31))) {
			expect(String(item.id)).toMatch(/-01$/);
		}
	});
});

describe('option lists', () => {
	const t = getTranslation('sv');

	it('offers the three rating types', () => {
		expect(ratingTypeItems(t).map((i) => i.id)).toEqual([
			RatingType.STANDARD,
			RatingType.RAPID,
			RatingType.BLITZ
		]);
	});

	it('offers every member category with a translated label', () => {
		const items = memberTypeItems(t);
		expect(items).toHaveLength(11);
		expect(items.map((i) => i.label).every((l) => l && l.length > 0)).toBe(true);
	});

	it('translates — Swedish and English labels differ', () => {
		const sv = ratingTypeItems(getTranslation('sv')).map((i) => i.label);
		const en = ratingTypeItems(getTranslation('en')).map((i) => i.label);
		expect(sv).not.toEqual(en);
	});
});
