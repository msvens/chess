<script lang="ts" generics="T">
	/**
	 * The app's generic data table. Ports `components/Table.tsx`.
	 *
	 * Sorting, paging and density live in `tableLogic.ts` as pure functions so they
	 * can be tested without rendering; this file is layout and wiring.
	 *
	 * Departures from the React original, all deliberate:
	 *
	 *  - Pagination no longer resets on the identity of `data`. See `clampPage`.
	 *  - Sticky offsets come from a lookup rather than string interpolation. The
	 *    original built `sticky ${column.sticky}-0`, which Tailwind's scanner cannot
	 *    see; it worked only because `left-0`/`right-0` happened to appear literally
	 *    in unrelated components.
	 *  - `cellStyle`, `headerStyle`, `rowClassName` and `size` are gone — no caller
	 *    used them, except `cellStyle: { fontWeight: 'medium' }`, which is not a
	 *    valid CSS font-weight and therefore never did anything. Use
	 *    `cellClassName: 'font-medium'`.
	 */
	import { untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import Pagination from './Pagination.svelte';
	import {
		cellValue,
		clampPage,
		nextSort,
		pageSlice,
		paginationInfo,
		resolveDensity,
		sortRows
	} from './tableLogic';
	import type {
		DensityThresholds,
		PaginationConfig,
		TableColumn,
		TableDensity,
		TableSort
	} from './tableTypes';

	interface TableProps {
		data: T[];
		columns: TableColumn<T>[];
		loading?: boolean;
		error?: string;
		emptyMessage?: string;
		loadingMessage?: string;
		hover?: boolean;
		striped?: boolean;
		border?: boolean;
		class?: string;
		getRowKey?: (row: T, index: number) => string | number;
		onRowClick?: (row: T, index: number) => void;
		/** Draws a heavier rule under a row — used to mark cut-offs in standings. */
		rowDivider?: (row: T, index: number) => boolean;
		/** Omit to size rows automatically from the row count. */
		density?: TableDensity;
		densityThresholds?: DensityThresholds;
		pagination?: boolean | PaginationConfig;
		defaultSort?: TableSort;
	}

	let {
		data,
		columns,
		loading = false,
		error,
		emptyMessage = 'No data available',
		loadingMessage = 'Loading...',
		hover = true,
		striped = true,
		border = true,
		class: cls = '',
		getRowKey,
		onRowClick,
		rowDivider,
		density,
		densityThresholds = { comfortable: 10, normal: 20 },
		pagination,
		defaultSort
	}: TableProps = $props();

	// `defaultSort` seeds the sort and is then the user's to change; a later change
	// from the parent is deliberately ignored, as in the React original. `untrack`
	// states that intent rather than leaving it as an accidental stale read.
	let sort = $state<TableSort | null>(untrack(() => defaultSort) ?? null);
	let requestedPage = $state(1);

	// md breakpoint. Per-component rather than module-level: a module-level
	// MediaQuery calls matchMedia at import time and pins one value for a whole
	// test run.
	const mobile = new MediaQuery('(max-width: 767px)');

	let pageConfig = $derived(
		pagination
			? {
					pageSize: (pagination === true ? undefined : pagination.pageSize) ?? 50,
					labels: pagination === true ? undefined : pagination.labels,
					showInfo: (pagination === true ? undefined : pagination.showInfo) ?? true
				}
			: null
	);

	let sorted = $derived(sortRows(data, columns, sort));
	let page = $derived(
		pageConfig ? clampPage(requestedPage, sorted.length, pageConfig.pageSize) : 1
	);
	let visible = $derived(pageConfig ? pageSlice(sorted, page, pageConfig.pageSize) : sorted);
	let info = $derived(
		pageConfig?.showInfo
			? paginationInfo(page, sorted.length, pageConfig.pageSize, pageConfig.labels)
			: null
	);

	let effectiveDensity = $derived(
		resolveDensity(density, mobile.current, visible.length, densityThresholds)
	);

	// Written out so Tailwind's scanner sees every class.
	const densityClasses: Record<TableDensity, string> = {
		compact: 'py-1 px-2',
		normal: 'p-2',
		comfortable: 'p-3'
	};
	const densityText: Record<TableDensity, string> = {
		compact: 'text-xs leading-tight',
		normal: 'text-sm leading-normal',
		comfortable: 'text-sm leading-relaxed'
	};
	const alignClasses = {
		left: 'text-left',
		center: 'text-center',
		right: 'text-right'
	} as const;
	// The reason this is a map and not `${column.sticky}-0`: see the header comment.
	const stickyOffset = { left: 'left-0', right: 'right-0' } as const;
	const stickyBorder = { left: 'border-r', right: 'border-l' } as const;

	function align(column: TableColumn<T>) {
		return alignClasses[column.align ?? 'left'];
	}

	function rowKey(row: T, index: number) {
		return getRowKey ? getRowKey(row, index) : index;
	}

	function onHeaderClick(column: TableColumn<T>) {
		if (!column.sortValue) return;
		sort = nextSort(sort, column.id);
		// Re-sorting means the old page number refers to different rows, so start
		// again from the top. Deliberate, unlike the identity-based reset.
		requestedPage = 1;
	}
</script>

{#if loading}
	<div class="overflow-x-auto">
		<div class="p-6 text-center">
			<div class="text-gray-600 dark:text-gray-400">{loadingMessage}</div>
		</div>
	</div>
{:else if error}
	<div class="overflow-x-auto">
		<div class="p-6 text-center">
			<div class="text-red-600 dark:text-red-400">{error}</div>
		</div>
	</div>
{:else if !data || data.length === 0}
	<div class="overflow-x-auto">
		<div class="p-6 text-center">
			<div class="text-gray-600 dark:text-gray-400">{emptyMessage}</div>
		</div>
	</div>
{:else}
	<div class={cls}>
		{#if info}
			<div class="mb-2 text-sm text-gray-600 dark:text-gray-400">{info}</div>
		{/if}

		<div class="overflow-x-auto">
			<table class="w-full {densityText[effectiveDensity]}">
				<thead>
					<tr class={border ? 'border-b border-gray-200 dark:border-gray-700' : ''}>
						{#each columns as column (column.id)}
							{@const sortable = Boolean(column.sortValue)}
							{@const active = sort?.columnId === column.id}
							<th
								scope="col"
								style={column.width ? `width: ${column.width}` : undefined}
								class="{densityClasses[
									effectiveDensity
								]} font-medium text-gray-900 dark:text-gray-200
									{align(column)}
									{column.noWrap ? 'whitespace-nowrap' : ''}
									{column.headerClassName ?? ''}
									{sortable ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700/30' : ''}
									{column.sticky
									? `sticky z-20 border-gray-200 bg-white dark:border-gray-700 dark:bg-dark-bg ${stickyOffset[column.sticky]} ${stickyBorder[column.sticky]}`
									: ''}"
								aria-sort={sortable
									? active
										? sort?.direction === 'asc'
											? 'ascending'
											: 'descending'
										: 'none'
									: undefined}
								onclick={() => onHeaderClick(column)}
							>
								{#if sortable}
									<span class="inline-flex items-center gap-1">
										{#if column.headerSnippet}{@render column.headerSnippet()}{:else}{column.header ??
												''}{/if}
										{#if active}
											<span class="text-blue-600 dark:text-blue-400">
												{sort?.direction === 'asc' ? '▲' : '▼'}
											</span>
										{/if}
									</span>
								{:else if column.headerSnippet}
									{@render column.headerSnippet()}
								{:else}
									{column.header ?? ''}
								{/if}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each visible as row, index (rowKey(row, index))}
						{@const zebra = striped && index % 2 === 1}
						<tr
							class="group
								{border
								? rowDivider?.(row, index)
									? 'border-b-2 border-gray-400 dark:border-gray-500'
									: 'border-b border-gray-200 dark:border-gray-700'
								: ''}
								{hover ? 'transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/30' : ''}
								{onRowClick ? 'cursor-pointer' : ''}
								{zebra ? 'bg-gray-50 dark:bg-gray-800/30' : ''}"
							onclick={onRowClick ? () => onRowClick(row, index) : undefined}
						>
							{#each columns as column (column.id)}
								<td
									class="{densityClasses[effectiveDensity]} text-gray-900 dark:text-gray-400
										{align(column)}
										{column.noWrap ? 'whitespace-nowrap' : ''}
										{column.cellClassName ?? ''}
										{column.sticky
										? `sticky z-10 border-gray-200 dark:border-gray-700 ${stickyOffset[column.sticky]} ${stickyBorder[column.sticky]} ${zebra ? 'bg-gray-50 dark:bg-gray-800/30' : 'bg-white dark:bg-dark-bg'} ${hover ? 'group-hover:bg-gray-100 dark:group-hover:bg-gray-700/30' : ''}`
										: ''}"
								>
									{#if column.cell}{@render column.cell(row)}{:else}{cellValue(row, column)}{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if pageConfig && sorted.length > pageConfig.pageSize}
			<div class="mt-4">
				<Pagination
					currentPage={page}
					totalItems={sorted.length}
					pageSize={pageConfig.pageSize}
					onPageChange={(p) => (requestedPage = p)}
				/>
			</div>
		{/if}
	</div>
{/if}
