import { describe, expect, it } from 'vitest';
import { filterItems, resolveListDensity, type SelectableListItem } from './listItems';

const items: SelectableListItem[] = [
	{ id: 1, label: 'Stockholms Schacksällskap', subtitle: 'Stockholm' },
	{ id: 2, label: 'Malmö AS', subtitle: 'Malmö' },
	{ id: 3, label: 'Wasa SK' }
];

describe('filterItems', () => {
	it('returns everything for a blank or whitespace filter', () => {
		expect(filterItems(items, '')).toBe(items);
		expect(filterItems(items, '   ')).toBe(items);
	});

	it('matches on the label, case-insensitively', () => {
		expect(filterItems(items, 'wasa').map((i) => i.id)).toEqual([3]);
		expect(filterItems(items, 'WASA').map((i) => i.id)).toEqual([3]);
	});

	it('matches on the subtitle too', () => {
		expect(filterItems(items, 'malmö').map((i) => i.id)).toEqual([2]);
	});

	it('matches anywhere in the string, not just the start', () => {
		expect(filterItems(items, 'schack').map((i) => i.id)).toEqual([1]);
	});

	it('copes with items that have no subtitle', () => {
		expect(() => filterItems(items, 'stockholm')).not.toThrow();
		expect(filterItems(items, 'stockholm').map((i) => i.id)).toEqual([1]);
	});

	it('returns nothing when nothing matches', () => {
		expect(filterItems(items, 'zzz')).toEqual([]);
	});
});

describe('resolveListDensity', () => {
	const t = { comfortable: 10, normal: 20 };

	it('honours an explicit density above all else', () => {
		expect(resolveListDensity('comfortable', true, 500, t)).toBe('comfortable');
	});

	it('is always compact on mobile', () => {
		expect(resolveListDensity(undefined, true, 2, t)).toBe('compact');
	});

	it('sizes from the item count on desktop', () => {
		expect(resolveListDensity(undefined, false, 10, t)).toBe('comfortable');
		expect(resolveListDensity(undefined, false, 11, t)).toBe('normal');
		expect(resolveListDensity(undefined, false, 20, t)).toBe('normal');
		expect(resolveListDensity(undefined, false, 21, t)).toBe('compact');
	});
});
