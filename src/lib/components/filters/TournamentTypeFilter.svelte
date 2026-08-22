<script lang="ts">
	/** Allsvenskan, Schackfyran and the rest. Ports `components/filters/TournamentTypeFilter.tsx`. */
	import SelectableList from '$lib/components/ui/SelectableList.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import { typeItems } from './filterItems';
	import type { ListDensity } from '$lib/components/ui/selectableListLogic';
	import type { TypeCounts } from '$lib/utils/tournamentFilters';

	interface Props {
		selected: number | null;
		onSelect: (value: number | null) => void;
		counts?: TypeCounts;
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
	let items = $derived(typeItems(t, counts));
</script>

<SelectableList
	{items}
	selectedId={selected ?? 'all'}
	onSelect={(id) => onSelect(id === 'all' ? null : Number(id))}
	title={showLabel ? t.components.tournamentTypeFilter.label : undefined}
	placeholder={t.components.selectableList.selectPlaceholder}
	{variant}
	{density}
	{transparent}
/>
