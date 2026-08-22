<script lang="ts">
	/**
	 * Dropdown over one prize type's categories, e.g. "Rating prizes: R1 (1575–1718)".
	 * Ports `components/results/PrizeCategoryFilter.tsx`.
	 *
	 * Renders nothing when the group offers no categories of this type — a group
	 * typically has one or two of the five, so most of these are absent.
	 */
	import SelectableList from '$lib/components/ui/SelectableList.svelte';
	import { prizeCategoryLabel } from '$lib/results/prizeCategories';
	import type { PrizeCategoryDto } from '$lib/api';
	import type { ListDensity } from '$lib/components/ui/selectableListLogic';

	/** SelectableList needs a concrete id, so "no selection" gets a sentinel. */
	const ALL_PRIZES = 'all';

	interface PrizeCategoryFilterProps {
		/** Categories of one prize type, already filtered and sorted. */
		categories: PrizeCategoryDto[];
		/** Selected category id, or null when showing everyone. */
		selectedId: number | null;
		onSelect: (categoryId: number | null) => void;
		title: string;
		/** Label for the clear-selection entry, e.g. "Alla". */
		allLabel: string;
		density?: ListDensity;
	}

	let { categories, selectedId, onSelect, title, allLabel, density }: PrizeCategoryFilterProps =
		$props();

	let items = $derived([
		{ id: ALL_PRIZES, label: allLabel },
		...categories.map((c) => ({ id: c.id, label: prizeCategoryLabel(c) }))
	]);
</script>

{#if categories.length > 0}
	<!-- `placeholder` never actually shows: the sentinel id means something is
	     always selected. `allLabel` is what an empty selection would mean. -->
	<SelectableList
		{items}
		selectedId={selectedId ?? ALL_PRIZES}
		onSelect={(id) => onSelect(id === ALL_PRIZES ? null : (id as number))}
		variant="dropdown"
		{title}
		placeholder={allLabel}
		{density}
	/>
{/if}
