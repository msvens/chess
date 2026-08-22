<script lang="ts">
	/**
	 * Pick a district, optionally showing how many items each holds.
	 * Ports `components/DistrictFilter.tsx`.
	 */
	import SelectableList from '$lib/components/ui/SelectableList.svelte';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import { districtItems, toDistrictId, toDistrictListId, type DistrictCount } from './filterItems';
	import type { ListDensity } from '$lib/components/ui/listItems';

	interface DistrictFilterProps {
		/** null is "all"; -1 is the Övriga bucket. */
		selectedDistrictId: number | null;
		onSelect: (districtId: number | null) => void;
		variant?: 'dropdown' | 'vertical';
		density?: ListDensity;
		transparent?: boolean;
		showLabel?: boolean;
		/** Supply to show counts and hide districts with nothing in them. */
		districtCounts?: DistrictCount[];
		totalCount?: number;
	}

	let {
		selectedDistrictId,
		onSelect,
		variant = 'dropdown',
		density,
		transparent = false,
		showLabel = true,
		districtCounts,
		totalCount
	}: DistrictFilterProps = $props();

	const organizations = getOrganizationsState();

	let t = $derived(getTranslation(language.current));
	let items = $derived(districtItems(t, organizations.districts, districtCounts, totalCount));
</script>

{#if organizations.loading}
	<div class="text-sm text-gray-600 dark:text-gray-400">{t.components.districtFilter.loading}</div>
{:else}
	<SelectableList
		{items}
		selectedId={toDistrictListId(selectedDistrictId)}
		onSelect={(id) => onSelect(toDistrictId(id))}
		title={showLabel ? t.components.districtFilter.district : undefined}
		placeholder={t.components.selectableList.selectPlaceholder}
		{variant}
		{density}
		{transparent}
	/>
{/if}
