<script lang="ts">
	/**
	 * A dropdown with a filter box, for lists too long to scan — the clubs list is
	 * around a thousand entries. Ports `components/SearchableSelectableList.tsx`.
	 *
	 * Separate from `SelectableList` rather than a flag on it, as in the original:
	 * the filter input, the empty state and the match count are enough extra
	 * structure that folding them together would make both harder to read.
	 */
	import { tick } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { ChevronDown, Icon } from 'svelte-hero-icons';
	import { clickOutside } from '$lib/attachments/clickOutside';
	import { escapeKey } from '$lib/attachments/escapeKey';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import {
		DEFAULT_LIST_THRESHOLDS,
		filterItems,
		resolveListDensity,
		type ListDensity,
		type ListDensityThresholds,
		type SelectableListItem
	} from './selectableListLogic';

	interface SearchableSelectableListProps {
		items: SelectableListItem[];
		selectedId: string | number | null;
		onSelect: (id: string | number) => void;
		title?: string;
		/** Trigger text when nothing is selected. Defaults to a translated "Select...". */
		placeholder?: string;
		class?: string;
		density?: ListDensity;
		densityThresholds?: ListDensityThresholds;
	}

	let {
		items,
		selectedId,
		onSelect,
		title,
		placeholder,
		class: cls = '',
		density,
		densityThresholds = DEFAULT_LIST_THRESHOLDS
	}: SearchableSelectableListProps = $props();

	let open = $state(false);
	let filter = $state('');
	let input = $state<HTMLInputElement | null>(null);
	const mobile = new MediaQuery('(max-width: 767px)');

	let t = $derived(getTranslation(language.current).components.selectableList);
	let effectiveDensity = $derived(
		resolveListDensity(density, mobile.current, items.length, densityThresholds)
	);
	let selectedItem = $derived(items.find((item) => item.id === selectedId));
	let filtered = $derived(filterItems(items, filter));

	const densityClasses: Record<
		ListDensity,
		{
			triggerPadding: string;
			itemPadding: string;
			fontSize: string;
			subtitleSize: string;
			lineHeight: string;
		}
	> = {
		compact: {
			triggerPadding: 'px-3 py-1.5',
			itemPadding: 'px-3 py-1',
			fontSize: 'text-xs',
			subtitleSize: 'text-[10px]',
			lineHeight: 'leading-tight'
		},
		normal: {
			triggerPadding: 'px-3 py-2',
			itemPadding: 'px-3 py-1.5',
			fontSize: 'text-sm',
			subtitleSize: 'text-xs',
			lineHeight: 'leading-normal'
		},
		comfortable: {
			triggerPadding: 'px-4 py-3',
			itemPadding: 'px-4 py-3',
			fontSize: 'text-sm',
			subtitleSize: 'text-xs',
			lineHeight: 'leading-relaxed'
		}
	};

	let d = $derived(densityClasses[effectiveDensity]);

	function close() {
		open = false;
		// Clear the filter on close so reopening starts from the whole list rather
		// than a stale search the user has forgotten about.
		filter = '';
	}

	async function toggle() {
		open = !open;
		if (!open) {
			filter = '';
			return;
		}
		// Focus after the panel exists, so typing can start immediately.
		await tick();
		input?.focus();
	}

	function select(id: string | number) {
		onSelect(id);
		close();
	}
</script>

<div class="relative {cls}" {@attach clickOutside(close)} {@attach escapeKey(close)}>
	{#if title}
		<h2 class="mb-2 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">{title}</h2>
	{/if}

	<button
		onclick={toggle}
		aria-expanded={open}
		aria-haspopup="listbox"
		class="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-dark-bg dark:hover:bg-gray-800 {d.triggerPadding} {d.fontSize} {d.lineHeight}"
	>
		<span class="text-gray-900 dark:text-gray-200">
			{selectedItem?.label ?? placeholder ?? t.selectPlaceholder}
		</span>
		<Icon
			src={ChevronDown}
			class="h-4 w-4 text-gray-500 transition-transform dark:text-gray-400 {open
				? 'rotate-180'
				: ''}"
			aria-hidden="true"
		/>
	</button>

	{#if open}
		<div
			class="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-dark-bg"
		>
			<div class="border-b border-gray-200 p-2 dark:border-gray-700">
				<input
					bind:this={input}
					bind:value={filter}
					type="text"
					placeholder={t.filterPlaceholder}
					aria-label={t.filterPlaceholder}
					class="w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-400"
				/>
			</div>

			<div class="max-h-60 overflow-y-auto" role="listbox">
				{#each filtered as item (item.id)}
					{@const selected = item.id === selectedId}
					<button
						role="option"
						aria-selected={selected}
						onclick={() => select(item.id)}
						title={item.tooltip}
						class="w-full text-left transition-colors {d.itemPadding} {d.fontSize} {d.lineHeight} {selected
							? 'bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-200'
							: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}"
					>
						<div>{item.label}</div>
						{#if item.subtitle}
							<div class="mt-0.5 text-gray-500 dark:text-gray-400 {d.subtitleSize}">
								{item.subtitle}
							</div>
						{/if}
					</button>
				{:else}
					<div class="text-center text-gray-500 dark:text-gray-400 {d.itemPadding} {d.fontSize}">
						{t.noResults}
					</div>
				{/each}
			</div>

			{#if filter}
				<div
					class="border-t border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
				>
					{t.resultCount
						.replace('{shown}', String(filtered.length))
						.replace('{total}', String(items.length))}
				</div>
			{/if}
		</div>
	{/if}
</div>
