<script lang="ts">
	/** Registration / in progress / finished. Ports `components/filters/TournamentStateFilter.tsx`. */
	import SelectableList from '$lib/components/ui/SelectableList.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import { stateItems } from './filterItems';
	import type { ListDensity } from '$lib/components/ui/selectableListLogic';
	import type { StateCounts } from '$lib/utils/tournamentFilters';

	interface Props {
		selected: number | null;
		onSelect: (value: number | null) => void;
		counts?: StateCounts;
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
	let items = $derived(stateItems(t, counts));
</script>

<SelectableList
	{items}
	selectedId={selected ?? 'all'}
	onSelect={(id) => onSelect(id === 'all' ? null : Number(id))}
	title={showLabel ? t.components.tournamentStateFilter.label : undefined}
	{variant}
	{density}
	{transparent}
/>
