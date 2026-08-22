<script lang="ts">
	/**
	 * A list of options, rendered either inline (`vertical`) or as a dropdown.
	 * Ports `components/SelectableList.tsx`.
	 *
	 * The `horizontal` variant is not carried over — no caller used it. Nor is the
	 * deprecated `compact` boolean; `density="compact"` says the same thing.
	 */
	import { MediaQuery } from 'svelte/reactivity';
	import { ChevronDown, Icon } from 'svelte-hero-icons';
	import { clickOutside } from '$lib/attachments/clickOutside';
	import { escapeKey } from '$lib/attachments/escapeKey';
	import {
		DEFAULT_LIST_THRESHOLDS,
		resolveListDensity,
		type ListDensity,
		type ListDensityThresholds,
		type SelectableListItem
	} from './listItems';

	interface SelectableListProps {
		items: SelectableListItem[];
		selectedId: string | number | null;
		onSelect: (id: string | number) => void;
		title?: string;
		showTitle?: boolean;
		/** Dropdown trigger text when nothing is selected. */
		placeholder: string;
		class?: string;
		variant?: 'vertical' | 'dropdown';
		/** Omit to size from the item count (and always compact on mobile). */
		density?: ListDensity;
		densityThresholds?: ListDensityThresholds;
		/** Softens the dropdown's background, for use over a map or image. */
		transparent?: boolean;
	}

	let {
		items,
		selectedId,
		onSelect,
		title,
		showTitle = true,
		placeholder,
		class: cls = '',
		variant = 'vertical',
		density,
		densityThresholds = DEFAULT_LIST_THRESHOLDS,
		transparent = false
	}: SelectableListProps = $props();

	let open = $state(false);
	const mobile = new MediaQuery('(max-width: 767px)');

	let effectiveDensity = $derived(
		resolveListDensity(density, mobile.current, items.length, densityThresholds)
	);
	let selectedItem = $derived(items.find((item) => item.id === selectedId));

	/*
	 * `dropdownMaxHeight` is deliberately sized to end on HALF a row, so an
	 * overflowing list always shows a sliced item — the cheapest, most reliable
	 * "there's more below" cue, and one that survives macOS overlay scrollbars
	 * being invisible until you actually scroll.
	 *
	 * Row height = vertical item padding + line-height at text-sm (14px), and the
	 * container adds py-1 (8px):
	 *   compact      2*4  + 14*1.25  = 25.5px  -> 12.5 rows + 8 = 327
	 *   normal       2*6  + 14*1.5   = 33px    ->  9.5 rows + 8 = 322
	 *   comfortable  2*12 + 14*1.625 = 46.75px ->  6.5 rows + 8 = 312
	 * Approximate by nature: an item with a `subtitle` is taller, so the slice
	 * won't land as neatly there. Keep these in step with the padding above.
	 */
	const densityClasses: Record<
		ListDensity,
		{
			triggerPadding: string;
			itemPadding: string;
			fontSize: string;
			subtitleSize: string;
			lineHeight: string;
			dropdownMaxHeight: string;
		}
	> = {
		compact: {
			triggerPadding: 'px-3 py-1.5',
			itemPadding: 'px-3 py-1',
			fontSize: 'text-sm',
			subtitleSize: 'text-xs',
			lineHeight: 'leading-tight',
			dropdownMaxHeight: 'max-h-[327px]'
		},
		normal: {
			triggerPadding: 'px-3 py-2',
			itemPadding: 'px-3 py-1.5',
			fontSize: 'text-sm',
			subtitleSize: 'text-xs',
			lineHeight: 'leading-normal',
			dropdownMaxHeight: 'max-h-[322px]'
		},
		comfortable: {
			triggerPadding: 'px-4 py-3',
			itemPadding: 'px-4 py-3',
			fontSize: 'text-sm',
			subtitleSize: 'text-xs',
			lineHeight: 'leading-relaxed',
			dropdownMaxHeight: 'max-h-[312px]'
		}
	};

	let d = $derived(densityClasses[effectiveDensity]);

	let triggerBg = $derived(
		transparent
			? 'bg-white/90 hover:bg-gray-50/90 dark:bg-dark-bg/90 dark:hover:bg-gray-800/90'
			: 'bg-white hover:bg-gray-50 dark:bg-dark-bg dark:hover:bg-gray-800'
	);
	let listBg = $derived(
		transparent ? 'bg-white/90 dark:bg-dark-bg/90' : 'bg-white dark:bg-dark-bg'
	);
	let itemHoverBg = $derived(
		transparent
			? 'hover:bg-gray-100/90 dark:hover:bg-gray-800/90'
			: 'hover:bg-gray-100 dark:hover:bg-gray-800'
	);
	let itemSelectedBg = $derived(
		transparent ? 'bg-gray-50/90 dark:bg-gray-900/90' : 'bg-gray-50 dark:bg-gray-900'
	);

	function select(id: string | number) {
		onSelect(id);
		if (variant === 'dropdown') open = false;
	}
</script>

{#if variant === 'dropdown'}
	<div class={cls}>
		{#if title && showTitle}
			<h2 class="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">{title}</h2>
		{/if}

		<div
			class="relative"
			{@attach clickOutside(() => (open = false))}
			{@attach escapeKey(() => (open = false))}
		>
			<button
				onclick={() => (open = !open)}
				aria-expanded={open}
				aria-haspopup="listbox"
				class="flex w-full items-center justify-between border border-gray-200 text-left shadow-lg transition-colors dark:border-gray-700 {d.triggerPadding} {d.lineHeight} {triggerBg} {open
					? 'rounded-t-lg border-b-0'
					: 'rounded-lg'}"
			>
				<div class="min-w-0 flex-1">
					<div class="truncate font-medium text-gray-900 dark:text-gray-200 {d.fontSize}">
						{selectedItem?.label ?? placeholder}
					</div>
				</div>
				<Icon
					src={ChevronDown}
					class="ml-2 h-5 w-5 flex-shrink-0 text-gray-400 transition-transform {open
						? 'rotate-180'
						: ''}"
					aria-hidden="true"
				/>
			</button>

			{#if open}
				<div
					class="absolute top-full left-0 z-50 w-max max-w-[min(24rem,calc(100vw-1.5rem))] min-w-full overflow-hidden rounded-b-lg border border-t-0 border-gray-200 shadow-lg dark:border-gray-700 {listBg}"
				>
					<!--
						flex-col, not a plain block: <button> is inline-block by default, and
						under the panel's `w-max` the items' `w-full` percentage is treated as
						auto — so they all sat on one line for intrinsic sizing and the panel's
						max-content became the SUM of every item's width, pinning it to the
						max-w cap. Laying them out as a column makes max-content the widest
						item, as intended.

						px-2 insets the items from the panel edge. With w-max the panel hugs its
						widest item exactly, so without this the longest label sits flush
						against the border — and an overlay scrollbar lands on top of it while
						scrolling.

						A thin, always-present scrollbar adds the "how much more" dimension the
						sliced row can't convey. macOS overlay scrollbars stay invisible until
						you scroll, so setting scrollbar-color is what forces one to show at all.
					-->
					<div
						role="listbox"
						class="flex [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] flex-col overflow-y-auto px-2 py-1 dark:[scrollbar-color:#475569_transparent] {d.dropdownMaxHeight}"
					>
						{#each items as item (item.id)}
							{@const selected = item.id === selectedId}
							<!-- shrink-0: the column has a max-height, so without it a long list
							     could compress its items instead of scrolling. -->
							<button
								role="option"
								aria-selected={selected}
								onclick={() => select(item.id)}
								title={item.tooltip}
								class="w-full shrink-0 rounded text-left transition-colors {d.itemPadding} {d.lineHeight} {itemHoverBg} {selected
									? `${itemSelectedBg} font-medium text-gray-900 dark:text-gray-200`
									: 'text-gray-600 dark:text-gray-400'}"
							>
								<div class="whitespace-nowrap {d.fontSize}">{item.label}</div>
								{#if item.subtitle}
									<div class="mt-0.5 opacity-70 {d.subtitleSize}">{item.subtitle}</div>
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<div class="p-2 {cls}">
		{#if title}
			<h2 class="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-200">{title}</h2>
		{/if}

		<div class="flex flex-col gap-1" role="listbox">
			{#each items as item (item.id)}
				{@const selected = item.id === selectedId}
				<button
					role="option"
					aria-selected={selected}
					onclick={() => select(item.id)}
					title={item.tooltip}
					class="w-full rounded px-3 py-2 text-left text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 {selected
						? 'bg-gray-100 font-medium text-gray-900 dark:bg-gray-800 dark:text-gray-200'
						: 'text-gray-600 dark:text-gray-400'}"
				>
					<div class="font-medium">{item.label}</div>
					{#if item.subtitle}
						<div class="mt-1 text-xs opacity-70">{item.subtitle}</div>
					{/if}
				</button>
			{/each}
		</div>
	</div>
{/if}
