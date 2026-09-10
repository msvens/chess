import { describe, expect, it } from 'vitest';
import { effectiveFontPx, paginateRows } from './printStyle';

describe('effectiveFontPx', () => {
	it('gives the mode its preferred size when the table is small', () => {
		expect(effectiveFontPx('small', true, 10)).toBe(11);
		expect(effectiveFontPx('medium', true, 10)).toBe(13);
		expect(effectiveFontPx('large', true, 10)).toBe(16);
	});

	it('caps large tables when auto is on, so they do not sprawl over pages', () => {
		// The cap steps down at 30, 45, 60 and 90 rows.
		expect(effectiveFontPx('large', true, 30)).toBe(16);
		expect(effectiveFontPx('large', true, 31)).toBe(14);
		expect(effectiveFontPx('large', true, 46)).toBe(12);
		expect(effectiveFontPx('large', true, 61)).toBe(11);
		expect(effectiveFontPx('large', true, 91)).toBe(10);
	});

	it('never enlarges past the mode — the cap is a ceiling, not a target', () => {
		expect(effectiveFontPx('small', true, 5)).toBe(11);
		expect(effectiveFontPx('small', true, 200)).toBe(10);
	});

	it('lets the mode win outright with auto off', () => {
		expect(effectiveFontPx('large', false, 200)).toBe(16);
		expect(effectiveFontPx('small', false, 1)).toBe(11);
	});
});

describe('paginateRows', () => {
	/** Rows that fit on a first page and on a continuation page, at 13px. */
	const firstPageCap = (fontPx: number) => paginateRows(1000, fontPx)[0].end;
	const contPageCap = (fontPx: number) => {
		const slices = paginateRows(1000, fontPx);
		return slices[1].end - slices[1].start;
	};

	it('is one empty page for no rows, so the sheet still prints its header', () => {
		expect(paginateRows(0, 13)).toEqual([{ start: 0, end: 0 }]);
	});

	it('keeps a sheet that fits on one page', () => {
		expect(paginateRows(5, 13)).toEqual([{ start: 0, end: 5 }]);
	});

	it('covers every row exactly once, in order', () => {
		const slices = paginateRows(137, 13);
		expect(slices[0].start).toBe(0);
		expect(slices[slices.length - 1].end).toBe(137);
		for (let i = 1; i < slices.length; i++) {
			expect(slices[i].start).toBe(slices[i - 1].end);
		}
	});

	it('fits fewer rows on the first page — it carries the sheet header and title', () => {
		expect(firstPageCap(13)).toBeLessThan(contPageCap(13));
	});

	it('splits at the first page boundary, not before', () => {
		const cap = firstPageCap(13);
		expect(paginateRows(cap, 13)).toHaveLength(1);
		expect(paginateRows(cap + 1, 13)).toHaveLength(2);
		expect(paginateRows(cap + 1, 13)[1]).toEqual({ start: cap, end: cap + 1 });
	});

	it('fits fewer rows per page at a larger font', () => {
		expect(firstPageCap(16)).toBeLessThan(firstPageCap(11));
	});

	it('always makes progress, even at an absurd font size', () => {
		// Guards the Math.max(1, …) floor: a zero-row page would loop forever.
		const slices = paginateRows(5, 400);
		expect(slices).toHaveLength(5);
		expect(slices.every((s) => s.end > s.start)).toBe(true);
	});
});
