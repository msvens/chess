<script lang="ts">
	/**
	 * Narrow a player's games to one time control.
	 * Ports `components/player/TimeControlFilter.tsx`.
	 *
	 * Barely more than a `SelectableList` with counts spliced into the labels, but
	 * the option set is a domain fact — these five, in this order — so it earns a
	 * component rather than being rebuilt at each call site.
	 */
	import SelectableList from '$lib/components/ui/SelectableList.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	export type TimeControl = 'all' | 'standard' | 'rapid' | 'blitz' | 'unrated';

	export type TimeControlCounts = Record<TimeControl, number>;

	interface TimeControlFilterProps {
		selected: TimeControl;
		onSelect: (timeControl: TimeControl) => void;
		counts: TimeControlCounts;
	}

	let { selected, onSelect, counts }: TimeControlFilterProps = $props();

	let t = $derived(getTranslation(language.current).pages.playerDetail.opponentsTab.timeControl);

	const order: TimeControl[] = ['all', 'standard', 'rapid', 'blitz', 'unrated'];

	let items = $derived(order.map((id) => ({ id, label: `${t[id]} (${counts[id]})` })));
</script>

<SelectableList
	{items}
	selectedId={selected}
	onSelect={(id) => onSelect(id as TimeControl)}
	title={t.label}
	placeholder={t.label}
	variant="dropdown"
/>
