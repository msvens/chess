<script lang="ts">
	/**
	 * Narrow a player's games to one time control.
	 * Ports `components/player/TimeControlFilter.tsx`.
	 *
	 * Barely more than a `SelectableList` with counts spliced into the labels, but
	 * the option set is a domain fact — these, in this order — so it earns a
	 * component rather than being rebuilt at each call site.
	 *
	 * Mixed exists only for tournaments: a single game is played at one control.
	 * The Opponents tab, which filters games, keeps the default five; the
	 * tournament tabs pass all six.
	 */
	import SelectableList from '$lib/components/ui/SelectableList.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	export type TimeControl = 'all' | 'standard' | 'rapid' | 'blitz' | 'mixed' | 'unrated';

	/** What a single game can be filtered by: a game is never mixed. */
	export type GameTimeControl = Exclude<TimeControl, 'mixed'>;

	/** A count for every option offered; the rest may be left out. */
	export type TimeControlCounts = Partial<Record<TimeControl, number>>;

	interface TimeControlFilterProps {
		selected: TimeControl;
		onSelect: (timeControl: TimeControl) => void;
		counts: TimeControlCounts;
		/** The options, in the order shown. */
		options?: TimeControl[];
	}

	let {
		selected,
		onSelect,
		counts,
		options = ['all', 'standard', 'rapid', 'blitz', 'unrated']
	}: TimeControlFilterProps = $props();

	let t = $derived(getTranslation(language.current).pages.playerDetail.timeControl);

	let items = $derived(options.map((id) => ({ id, label: `${t[id]} (${counts[id] ?? 0})` })));
</script>

<SelectableList
	{items}
	selectedId={selected}
	onSelect={(id) => onSelect(id as TimeControl)}
	title={t.label}
	placeholder={t.label}
	variant="dropdown"
/>
