import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { createRawSnippet } from 'svelte';
import { paginateRows } from '$lib/print/printStyle';
import PrintSheet from './PrintSheet.svelte';

const sheetHeader = createRawSnippet(() => ({ render: () => '<header>Test Open</header>' }));
const columnHeader = createRawSnippet(() => ({ render: () => '<tr><th>Namn</th></tr>' }));
const row = createRawSnippet((item: () => unknown, index: () => number) => ({
	render: () => `<tr><td>${index()}: ${String(item())}</td></tr>`
}));

const names = (count: number) => Array.from({ length: count }, (_, i) => `Player ${i + 1}`);

function setup(rows: string[], fontPx = 13) {
	render(PrintSheet, {
		props: {
			sheetHeader,
			title: 'Rond 3',
			columnHeader,
			rows,
			row,
			emptyMessage: 'Inga partier',
			fontPx
		}
	});
}

const pages = () => document.querySelectorAll('.print-page');

describe('PrintSheet', () => {
	it('is one page carrying the header and the empty message when there are no rows', () => {
		setup([]);
		expect(pages()).toHaveLength(1);
		expect(screen.getByText('Test Open')).toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 2, name: 'Rond 3' })).toBeInTheDocument();
		expect(screen.getByText('Inga partier')).toBeInTheDocument();
		expect(screen.queryByRole('table')).toBeNull();
	});

	it('puts a short sheet on one page', () => {
		setup(names(5));
		expect(pages()).toHaveLength(1);
		expect(screen.getAllByRole('row')).toHaveLength(6); // 5 rows + the column header
	});

	it('splits a long sheet across pages, exactly as paginateRows says', () => {
		const rows = names(200);
		setup(rows);
		expect(pages()).toHaveLength(paginateRows(rows.length, 13).length);
		expect(pages().length).toBeGreaterThan(1);
	});

	it('carries the sheet header and title on the first page only', () => {
		setup(names(200));
		expect(screen.getAllByText('Test Open')).toHaveLength(1);
		expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
		expect(within(pages()[0] as HTMLElement).getByText('Test Open')).toBeInTheDocument();
	});

	it('repeats the column header on every page', () => {
		setup(names(200));
		for (const page of pages()) {
			expect(within(page as HTMLElement).getByText('Namn')).toBeInTheDocument();
		}
	});

	it('renders every row once, in order, across the pages', () => {
		const rows = names(200);
		setup(rows);
		for (const name of rows) {
			expect(screen.getAllByText(new RegExp(`: ${name}$`))).toHaveLength(1);
		}
	});

	it('numbers rows across the whole sheet, not per page', () => {
		// A match on page two must not renumber from one — the index has to be
		// the absolute one, which is why the row snippet is given it.
		const rows = names(200);
		setup(rows);
		const lastPage = pages()[pages().length - 1] as HTMLElement;
		const lastIndex = rows.length - 1;
		expect(within(lastPage).getByText(`${lastIndex}: Player ${rows.length}`)).toBeInTheDocument();
	});

	it('applies the font size to every page, since print sizing drives the layout', () => {
		setup(names(200), 16);
		for (const page of pages()) {
			expect((page as HTMLElement).style.fontSize).toBe('16px');
		}
	});
});
