<script lang="ts">
	/**
	 * Test-only wrapper. Exists because a column's `cell` is a snippet, which can
	 * only be declared in markup — so exercising the snippet path needs a real
	 * component rather than a plain object built in a test file.
	 */
	import Table from './Table.svelte';
	import type { PaginationConfig, TableColumn, TableDensity, TableSort } from './tableTypes';

	export interface HarnessRow {
		id: number;
		name: string;
		rating: number | null;
	}

	interface HarnessProps {
		data: HarnessRow[];
		pagination?: boolean | PaginationConfig;
		defaultSort?: TableSort;
		density?: TableDensity;
		onRowClick?: (row: HarnessRow, index: number) => void;
		/** Adds a column whose cell is a snippet, to cover the markup path. */
		withRichCell?: boolean;
		sortable?: boolean;
	}

	let {
		data,
		pagination,
		defaultSort,
		density,
		onRowClick,
		withRichCell = false,
		sortable = true
	}: HarnessProps = $props();

	let columns = $derived<TableColumn<HarnessRow>[]>([
		{
			id: 'name',
			header: 'Name',
			accessor: 'name',
			sortValue: sortable ? (r) => r.name : undefined
		},
		{ id: 'rating', header: 'Rating', accessor: (r) => r.rating, align: 'right' },
		...(withRichCell ? [{ id: 'link', header: 'Link', cell: richCell }] : [])
	]);
</script>

{#snippet richCell(row: HarnessRow)}
	<a href="/players/{row.id}" data-testid="rich-{row.id}">{row.name}</a>
{/snippet}

<Table {data} {columns} {pagination} {defaultSort} {density} {onRowClick} getRowKey={(r) => r.id} />
