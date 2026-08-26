<script lang="ts">
	/**
	 * Marker popup content for the tournament map.
	 *
	 * A component rather than an HTML string because Leaflet takes a DOM node, and
	 * building the markup by hand would mean escaping names from the API ourselves.
	 * The link is a plain `<a>`: SvelteKit intercepts anchor clicks anywhere in the
	 * document, so it navigates client-side even though Leaflet inserted it.
	 *
	 * Labels arrive as a prop rather than being read from the store: Leaflet mounts
	 * this outside the component tree, where there is no context to read.
	 */
	import type { TournamentDto } from '$lib/api';
	import { formatEventRange, hasReversedDates } from './eventLabels';

	interface TournamentPopupProps {
		tournament: TournamentDto;
		organizerName: string;
		typeName: string;
		dateFormat: Intl.DateTimeFormat;
		labels: {
			organizer: string;
			city: string;
			type: string;
			dateRange: string;
			reversedDates: string;
		};
	}

	let { tournament, organizerName, typeName, dateFormat, labels }: TournamentPopupProps = $props();
</script>

<a href="/results/{tournament.id}" class="block text-sm font-semibold">{tournament.name}</a>

<dl class="mt-1 space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
	<div class="flex gap-1">
		<dt class="shrink-0 font-medium">{labels.organizer}:</dt>
		<dd>{organizerName}</dd>
	</div>
	{#if tournament.city}
		<div class="flex gap-1">
			<dt class="shrink-0 font-medium">{labels.city}:</dt>
			<dd>{tournament.city}</dd>
		</div>
	{/if}
	{#if typeName}
		<div class="flex gap-1">
			<dt class="shrink-0 font-medium">{labels.type}:</dt>
			<dd>{typeName}</dd>
		</div>
	{/if}
	<div class="flex gap-1">
		<dt class="shrink-0 font-medium">{labels.dateRange}:</dt>
		<dd>
			{formatEventRange(tournament, dateFormat)}
			{#if hasReversedDates(tournament)}
				<!-- Shown as entered, and marked — as everywhere else the dates appear. -->
				<span
					class="text-amber-600 dark:text-amber-400"
					title={labels.reversedDates}
					aria-label={labels.reversedDates}>⚠</span
				>
			{/if}
		</dd>
	</div>
</dl>
