<script lang="ts">
	/**
	 * The colour key for a pie: a dot and a label per slice, in the order
	 * `legendOrder` gives (alphabetical, as recharts sorted it).
	 *
	 * A component of its own so one key can serve several pies: where they share
	 * colours, `OpponentPieCharts` shows it once beneath all three instead of
	 * under each.
	 */
	import { legendOrder, type Slice } from './pie';

	interface PieLegendProps {
		slices: Slice[];
	}

	let { slices }: PieLegendProps = $props();

	let entries = $derived(legendOrder(slices));
</script>

<!-- A zero entry keeps its row: it is how a player learns they have never
     drawn as black. -->
<div class="flex flex-wrap justify-center gap-4 pt-[10px] text-sm">
	{#each entries as entry (entry.label)}
		<span class="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
			<svg width="10" height="10" aria-hidden="true">
				<circle cx="5" cy="5" r="5" fill={entry.colour} />
			</svg>
			{entry.label}
		</span>
	{/each}
</div>
