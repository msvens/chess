<script lang="ts">
	/**
	 * Page buttons for `Table.svelte`. Ports `components/Pagination.tsx`.
	 *
	 * The windowing — which pages to show, where the ellipses fall — lives in
	 * `pageNumbers.ts` and is tested there.
	 */
	import { ChevronLeft, ChevronRight, Icon } from 'svelte-hero-icons';
	import { pageNumbers } from './pageNumbers';

	interface PaginationProps {
		/** 1-indexed. */
		currentPage: number;
		totalItems: number;
		pageSize: number;
		onPageChange: (page: number) => void;
		maxPageButtons?: number;
	}

	let {
		currentPage,
		totalItems,
		pageSize,
		onPageChange,
		maxPageButtons = 7
	}: PaginationProps = $props();

	let totalPages = $derived(Math.ceil(totalItems / pageSize));
	let tokens = $derived(pageNumbers(currentPage, totalPages, maxPageButtons));
	let canGoPrev = $derived(currentPage > 1);
	let canGoNext = $derived(currentPage < totalPages);

	const step = 'rounded-lg p-2 transition-colors';
	const stepEnabled = 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800';
	const stepDisabled = 'cursor-not-allowed text-gray-300 dark:text-gray-600';
</script>

{#if totalPages > 1}
	<nav class="flex items-center justify-center gap-1" aria-label="Pagination">
		<button
			onclick={() => canGoPrev && onPageChange(currentPage - 1)}
			disabled={!canGoPrev}
			class="{step} {canGoPrev ? stepEnabled : stepDisabled}"
			aria-label="Previous page"
		>
			<Icon src={ChevronLeft} class="h-5 w-5" aria-hidden="true" />
		</button>

		<div class="flex items-center gap-1">
			{#each tokens as token, i (token === 'ellipsis' ? `gap-${i}` : token)}
				{#if token === 'ellipsis'}
					<span class="px-2 py-1 text-gray-400 dark:text-gray-500" aria-hidden="true">...</span>
				{:else}
					{@const active = token === currentPage}
					<button
						onclick={() => onPageChange(token)}
						class="min-w-[2.5rem] rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {active
							? 'bg-blue-600 text-white'
							: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}"
						aria-current={active ? 'page' : undefined}
					>
						{token}
					</button>
				{/if}
			{/each}
		</div>

		<button
			onclick={() => canGoNext && onPageChange(currentPage + 1)}
			disabled={!canGoNext}
			class="{step} {canGoNext ? stepEnabled : stepDisabled}"
			aria-label="Next page"
		>
			<Icon src={ChevronRight} class="h-5 w-5" aria-hidden="true" />
		</button>
	</nav>
{/if}
