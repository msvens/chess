import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Harness, { type HarnessRow } from './TableHarness.svelte';
import Table from './Table.svelte';

const rows: HarnessRow[] = [
	{ id: 1, name: 'Carlsen', rating: 2823 },
	{ id: 2, name: 'Andersson', rating: 2400 },
	{ id: 3, name: 'Berg', rating: null }
];

const many = (n: number): HarnessRow[] =>
	Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `Player ${i + 1}`, rating: 2000 + i }));

const bodyText = () =>
	Array.from(document.querySelectorAll('tbody tr')).map((tr) => tr.textContent ?? '');

describe('Table rendering', () => {
	it('renders headers and rows', () => {
		render(Harness, { props: { data: rows } });
		expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
		expect(document.querySelectorAll('tbody tr')).toHaveLength(3);
	});

	it('renders a null value as a dash rather than blank', () => {
		render(Harness, { props: { data: rows } });
		expect(bodyText()[2]).toContain('-');
	});

	it('renders a snippet cell, which is how columns needing markup work', () => {
		render(Harness, { props: { data: rows, withRichCell: true } });
		expect(screen.getByTestId('rich-1')).toHaveAttribute('href', '/players/1');
	});

	it('shows the empty message instead of an empty table', () => {
		render(Table, {
			props: { data: [], columns: [], emptyMessage: 'Inga resultat', loadingMessage: 'Laddar...' }
		});
		expect(screen.getByText('Inga resultat')).toBeInTheDocument();
		expect(document.querySelector('table')).toBeNull();
	});

	it('shows loading and error states in preference to data', () => {
		const { unmount } = render(Table, {
			props: {
				data: rows,
				columns: [],
				loading: true,
				emptyMessage: 'Inga resultat',
				loadingMessage: 'Laddar...'
			}
		});
		expect(screen.getByText('Laddar...')).toBeInTheDocument();
		unmount();
		render(Table, {
			props: {
				data: rows,
				columns: [],
				error: 'Kunde inte hämta',
				emptyMessage: 'Inga resultat',
				loadingMessage: 'Laddar...'
			}
		});
		expect(screen.getByText('Kunde inte hämta')).toBeInTheDocument();
	});
});

describe('Table sorting', () => {
	it('cycles a column asc -> desc -> unsorted on repeated clicks', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { data: rows } });
		const header = screen.getByRole('columnheader', { name: /name/i });

		expect(header).toHaveAttribute('aria-sort', 'none');
		await user.click(header);
		expect(header).toHaveAttribute('aria-sort', 'ascending');
		expect(bodyText()[0]).toContain('Andersson');

		await user.click(header);
		expect(header).toHaveAttribute('aria-sort', 'descending');
		expect(bodyText()[0]).toContain('Carlsen');

		await user.click(header);
		expect(header).toHaveAttribute('aria-sort', 'none');
		// Back to the order the caller supplied.
		expect(bodyText()[0]).toContain('Carlsen');
		expect(bodyText()[1]).toContain('Andersson');
	});

	it('does not make a column without sortValue clickable', async () => {
		render(Harness, { props: { data: rows, sortable: false } });
		expect(screen.getByRole('columnheader', { name: /name/i })).not.toHaveAttribute('aria-sort');
	});

	it('honours defaultSort', () => {
		render(Harness, { props: { data: rows, defaultSort: { columnId: 'name', direction: 'asc' } } });
		expect(bodyText()[0]).toContain('Andersson');
	});
});

describe('Table pagination', () => {
	it('shows only one page of rows, with an info line', () => {
		render(Harness, { props: { data: many(25), pagination: { pageSize: 10 } } });
		expect(document.querySelectorAll('tbody tr')).toHaveLength(10);
		expect(screen.getByText('1-10 / 25')).toBeInTheDocument();
	});

	it('navigates between pages', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { data: many(25), pagination: { pageSize: 10 } } });
		await user.click(screen.getByRole('button', { name: '3' }));
		expect(screen.getByText('21-25 / 25')).toBeInTheDocument();
		expect(document.querySelectorAll('tbody tr')).toHaveLength(5);
	});

	// The regression this component exists to fix. The React version reset the page
	// whenever `data` changed by ARRAY IDENTITY, so a caller rebuilding its rows —
	// which most do, since rows are derived — bounced the user to page 1 on any
	// unrelated re-render. Rerendering with an equal-but-new array must not move us.
	it('keeps the current page when data is rebuilt with equal contents', async () => {
		const user = userEvent.setup();
		const { rerender } = render(Harness, {
			props: { data: many(25), pagination: { pageSize: 10 } }
		});
		await user.click(screen.getByRole('button', { name: '3' }));
		expect(screen.getByText('21-25 / 25')).toBeInTheDocument();

		await rerender({ data: many(25), pagination: { pageSize: 10 } });
		expect(screen.getByText('21-25 / 25')).toBeInTheDocument();
	});

	it('falls back to the last real page when the data shrinks under it', async () => {
		const user = userEvent.setup();
		const { rerender } = render(Harness, {
			props: { data: many(25), pagination: { pageSize: 10 } }
		});
		await user.click(screen.getByRole('button', { name: '3' }));
		await rerender({ data: many(12), pagination: { pageSize: 10 } });
		// Page 3 no longer exists; land on 2, not on an empty page.
		expect(screen.getByText('11-12 / 12')).toBeInTheDocument();
		expect(document.querySelectorAll('tbody tr')).toHaveLength(2);
	});

	it('returns to page 1 when the sort changes, since the rows now differ', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { data: many(25), pagination: { pageSize: 10 } } });
		await user.click(screen.getByRole('button', { name: '3' }));
		expect(screen.getByText('21-25 / 25')).toBeInTheDocument();
		await user.click(screen.getByRole('columnheader', { name: /name/i }));
		expect(screen.getByText('1-10 / 25')).toBeInTheDocument();
	});

	it('renders no pager when everything fits on one page', () => {
		render(Harness, { props: { data: rows, pagination: { pageSize: 10 } } });
		expect(screen.queryByRole('navigation', { name: /pagination/i })).toBeNull();
	});
});

describe('Table interaction', () => {
	it('calls onRowClick with the row and its index', async () => {
		const user = userEvent.setup();
		const onRowClick = vi.fn();
		render(Harness, { props: { data: rows, onRowClick } });
		await user.click(
			within(document.querySelectorAll('tbody tr')[1] as HTMLElement).getByText('Andersson')
		);
		expect(onRowClick).toHaveBeenCalledWith(rows[1], 1);
	});
});
