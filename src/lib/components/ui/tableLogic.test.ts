import { describe, expect, it } from 'vitest';
import {
	cellValue,
	clampPage,
	nextSort,
	pageCount,
	pageSlice,
	paginationInfo,
	resolveDensity,
	sortRows
} from './tableLogic';
import type { TableColumn } from './tableTypes';

interface Row {
	id: number;
	name: string;
	rating: number | null;
}

const rows: Row[] = [
	{ id: 1, name: 'Carlsen', rating: 2823 },
	{ id: 2, name: 'Andersson', rating: 2400 },
	{ id: 3, name: 'Berg', rating: null }
];

const columns: TableColumn<Row>[] = [
	{ id: 'name', header: 'Name', accessor: 'name', sortValue: (r) => r.name },
	{ id: 'rating', header: 'Rating', accessor: (r) => r.rating },
	{ id: 'plain', header: 'Plain', accessor: 'id' }
];

describe('nextSort', () => {
	it('cycles a column unsorted -> asc -> desc -> unsorted', () => {
		const asc = nextSort(null, 'name');
		expect(asc).toEqual({ columnId: 'name', direction: 'asc' });
		const desc = nextSort(asc, 'name');
		expect(desc).toEqual({ columnId: 'name', direction: 'desc' });
		expect(nextSort(desc, 'name')).toBeNull();
	});

	it('starts a different column fresh at asc', () => {
		expect(nextSort({ columnId: 'name', direction: 'desc' }, 'rating')).toEqual({
			columnId: 'rating',
			direction: 'asc'
		});
	});
});

describe('sortRows', () => {
	it('returns the original order when unsorted', () => {
		expect(sortRows(rows, columns, null)).toBe(rows);
	});

	it('sorts ascending and descending', () => {
		const asc = sortRows(rows, columns, { columnId: 'name', direction: 'asc' });
		expect(asc.map((r) => r.name)).toEqual(['Andersson', 'Berg', 'Carlsen']);
		const desc = sortRows(rows, columns, { columnId: 'name', direction: 'desc' });
		expect(desc.map((r) => r.name)).toEqual(['Carlsen', 'Berg', 'Andersson']);
	});

	it('does not mutate the caller’s array', () => {
		const original = [...rows];
		sortRows(rows, columns, { columnId: 'name', direction: 'asc' });
		expect(rows).toEqual(original);
	});

	it('ignores a sort on a column with no sortValue', () => {
		expect(sortRows(rows, columns, { columnId: 'rating', direction: 'asc' })).toBe(rows);
	});
});

describe('clampPage — the pagination trap', () => {
	// The React version reset currentPage to 1 whenever the `data` ARRAY IDENTITY
	// changed. Callers building rows inline (most of them, since rows are derived)
	// therefore lost their page on any unrelated re-render. Clamping is
	// identity-free, so a caller passing an equal-but-new array keeps its page.
	it('keeps the page when data is rebuilt with the same contents', () => {
		const rebuilt = rows.map((r) => ({ ...r }));
		expect(clampPage(3, rebuilt.length * 40, 10)).toBe(3);
	});

	it('lands on the last real page when data shrinks, never an empty one', () => {
		expect(clampPage(9, 25, 10)).toBe(3);
	});

	it('never goes below 1', () => {
		expect(clampPage(0, 25, 10)).toBe(1);
		expect(clampPage(-5, 25, 10)).toBe(1);
	});

	it('reports one page for an empty table rather than zero', () => {
		expect(pageCount(0, 10)).toBe(1);
		expect(clampPage(1, 0, 10)).toBe(1);
	});
});

describe('pageSlice', () => {
	const many = Array.from({ length: 25 }, (_, i) => i + 1);

	it('slices the requested page', () => {
		expect(pageSlice(many, 1, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		expect(pageSlice(many, 3, 10)).toEqual([21, 22, 23, 24, 25]);
	});

	it('clamps an out-of-range page instead of returning nothing', () => {
		expect(pageSlice(many, 99, 10)).toEqual([21, 22, 23, 24, 25]);
	});
});

describe('paginationInfo', () => {
	it('uses the terse form without labels', () => {
		expect(paginationInfo(1, 3334, 50)).toBe('1-50 / 3334');
		expect(paginationInfo(2, 3334, 50)).toBe('51-100 / 3334');
	});

	it('does not overshoot the total on the last page', () => {
		expect(paginationInfo(3, 25, 10)).toBe('21-25 / 25');
	});

	it('uses labels when given', () => {
		expect(paginationInfo(1, 120, 50, { showing: 'Visar', of: 'av', itemName: 'klubbar' })).toBe(
			'Visar 1-50 av 120 klubbar'
		);
	});

	it('says nothing for an empty table', () => {
		expect(paginationInfo(1, 0, 50)).toBeNull();
	});
});

describe('resolveDensity', () => {
	const t = { comfortable: 10, normal: 20 };

	it('honours an explicit density over everything', () => {
		expect(resolveDensity('comfortable', true, 500, t)).toBe('comfortable');
	});

	it('is always compact on mobile', () => {
		expect(resolveDensity(undefined, true, 3, t)).toBe('compact');
	});

	it('picks by row count on desktop', () => {
		expect(resolveDensity(undefined, false, 10, t)).toBe('comfortable');
		expect(resolveDensity(undefined, false, 11, t)).toBe('normal');
		expect(resolveDensity(undefined, false, 20, t)).toBe('normal');
		expect(resolveDensity(undefined, false, 21, t)).toBe('compact');
	});
});

describe('cellValue', () => {
	it('reads a property accessor', () => {
		expect(cellValue(rows[0], columns[2])).toBe('1');
	});

	it('reads a function accessor', () => {
		expect(cellValue(rows[0], columns[1])).toBe('2823');
	});

	it('renders null and undefined as a dash', () => {
		expect(cellValue(rows[2], columns[1])).toBe('-');
		expect(cellValue(rows[0], { id: 'none', header: 'None' })).toBe('-');
	});

	it('renders zero and false rather than treating them as empty', () => {
		expect(cellValue({ id: 0, name: '', rating: 0 }, columns[1])).toBe('0');
	});
});
