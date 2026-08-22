import { describe, expect, it } from 'vitest';
import { pageNumbers } from './pageNumbers';

const nums = (t: ReturnType<typeof pageNumbers>) => t.filter((p) => p !== 'ellipsis');

describe('pageNumbers', () => {
	it('lists every page when they all fit', () => {
		expect(pageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
		expect(pageNumbers(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});

	it('handles the degenerate cases', () => {
		expect(pageNumbers(1, 1)).toEqual([1]);
		expect(pageNumbers(1, 0)).toEqual([]);
	});

	it('always shows the first and last page', () => {
		for (const current of [1, 5, 50, 99, 100]) {
			const t = pageNumbers(current, 100);
			expect(t[0]).toBe(1);
			expect(t.at(-1)).toBe(100);
		}
	});

	it('windows around the current page in the middle', () => {
		expect(pageNumbers(50, 100)).toEqual([1, 'ellipsis', 48, 49, 50, 51, 52, 'ellipsis', 100]);
	});

	it('grows the window near the start instead of collapsing it', () => {
		expect(pageNumbers(1, 100)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 100]);
	});

	it('grows the window near the end instead of collapsing it', () => {
		expect(pageNumbers(100, 100)).toEqual([1, 'ellipsis', 96, 97, 98, 99, 100]);
	});

	it('never repeats a page number', () => {
		for (let total = 2; total <= 40; total++) {
			for (let current = 1; current <= total; current++) {
				const ns = nums(pageNumbers(current, total));
				expect(new Set(ns).size, `dupes at page ${current}/${total}`).toBe(ns.length);
			}
		}
	});

	it('keeps page numbers strictly ascending', () => {
		for (let total = 2; total <= 40; total++) {
			for (let current = 1; current <= total; current++) {
				const ns = nums(pageNumbers(current, total)) as number[];
				for (let i = 1; i < ns.length; i++) {
					expect(ns[i], `out of order at page ${current}/${total}`).toBeGreaterThan(ns[i - 1]);
				}
			}
		}
	});

	it('always includes the current page', () => {
		for (let total = 2; total <= 40; total++) {
			for (let current = 1; current <= total; current++) {
				expect(nums(pageNumbers(current, total)), `missing ${current}/${total}`).toContain(current);
			}
		}
	});

	it('never renders an ellipsis that hides exactly one page', () => {
		// An "..." standing in for a single number is worse than the number itself.
		for (let total = 2; total <= 60; total++) {
			for (let current = 1; current <= total; current++) {
				const t = pageNumbers(current, total);
				for (let i = 1; i < t.length - 1; i++) {
					if (t[i] !== 'ellipsis') continue;
					const gap = (t[i + 1] as number) - (t[i - 1] as number);
					expect(gap, `pointless ellipsis at page ${current}/${total}`).toBeGreaterThan(2);
				}
			}
		}
	});
});
