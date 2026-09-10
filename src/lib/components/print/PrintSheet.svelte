<script lang="ts" generics="T">
	/**
	 * One sheet — a pairing list or a standings table — laid out across as many
	 * A4 page cards as its rows need.
	 * Ports `components/print/PrintSheet.tsx`.
	 *
	 * `paginateRows` decides the split, so the cards on screen match the pages
	 * that come out of the printer. The first page carries the sheet header and
	 * the section heading; the column header repeats on every page.
	 *
	 * React was handed `rows: ReactNode[]` and sliced the built elements. Svelte
	 * cannot pass an array of markup, so this takes the rows as data plus a
	 * snippet to render one — which also means a ten-page sheet only ever builds
	 * the rows it shows.
	 */
	import type { Snippet } from 'svelte';
	import { paginateRows } from '$lib/print/printStyle';

	interface PrintSheetProps {
		/** Tournament, class and dates. Shown on this sheet's first page only. */
		sheetHeader: Snippet;
		title: string;
		/** The `<tr>` of `<th>` column headers, repeated on every page. */
		columnHeader: Snippet;
		rows: T[];
		/** Renders one row, given its index across the whole sheet — the index has
		    to survive pagination, or a match on page two renumbers from one. */
		row: Snippet<[T, number]>;
		emptyMessage: string;
		fontPx: number;
	}

	let { sheetHeader, title, columnHeader, rows, row, emptyMessage, fontPx }: PrintSheetProps =
		$props();

	let pages = $derived(paginateRows(rows.length, fontPx));
</script>

{#snippet heading()}
	<div class="mb-2">
		<h2 class="text-base font-bold">{title}</h2>
	</div>
{/snippet}

{#if rows.length === 0}
	<div class="print-page text-black" style="font-size: {fontPx}px">
		{@render sheetHeader()}
		{@render heading()}
		<p class="text-sm text-gray-600">{emptyMessage}</p>
	</div>
{:else}
	{#each pages as page, index (index)}
		<div class="print-page text-black" style="font-size: {fontPx}px">
			{#if index === 0}
				{@render sheetHeader()}
				{@render heading()}
			{/if}
			<table class="w-full border-collapse">
				<thead>{@render columnHeader()}</thead>
				<tbody>
					{#each rows.slice(page.start, page.end) as item, offset (page.start + offset)}
						{@render row(item, page.start + offset)}
					{/each}
				</tbody>
			</table>
		</div>
	{/each}
{/if}
