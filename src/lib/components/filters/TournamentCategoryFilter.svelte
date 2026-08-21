<script lang="ts">
	/** Team / individual / all. Ports `components/filters/TournamentCategoryFilter.tsx`. */
	import SelectableList from '$lib/components/ui/SelectableList.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import { categoryItems } from './filterItems';
	import type { ListDensity } from '$lib/components/ui/selectableListLogic';
	import type { CategoryCounts, TournamentCategory } from '$lib/utils/tournamentFilters';

	interface Props {
		selected: TournamentCategory;
		onSelect: (value: TournamentCategory) => void;
		counts?: CategoryCounts;
		variant?: 'dropdown' | 'vertical';
		density?: ListDensity;
		transparent?: boolean;
		showLabel?: boolean;
	}

	let {
		selected,
		onSelect,
		counts,
		variant = 'dropdown',
		density,
		transparent = false,
		showLabel = true
	}: Props = $props();

	let t = $derived(getTranslation(language.current));
	let items = $derived(categoryItems(t, counts));
</script>

<SelectableList
	{items}
	selectedId={selected}
	onSelect={(id) => onSelect(id as TournamentCategory)}
	title={showLabel ? t.components.tournamentCategoryFilter.label : undefined}
	{variant}
	{density}
	{transparent}
/>
