<script lang="ts">
	/**
	 * One event bar inside a month row.
	 * Ports `components/calendar/EventBar.tsx`.
	 *
	 * Positioned as a percentage of the seven-column row so it lines up with the
	 * day cells drawn behind it, rather than living inside any one cell — a bar
	 * spanning Tuesday to Friday belongs to four of them.
	 */
	import type { PositionedSegment } from '$lib/utils/calendarLayout';
	import type { TournamentDto } from '$lib/api';
	import { barClasses } from './calendarColors';
	import { hasReversedDates } from './eventLabels';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface EventBarProps {
		segment: PositionedSegment;
		/** Day number of the row's first cell, so a click knows which day it hit. */
		rowStartDayNumber: number;
		/** Pixel offset of the bar within the row. */
		top: number;
		height: number;
		onSelect: (tournament: TournamentDto, dayNumber: number) => void;
	}

	let { segment, rowStartDayNumber, top, height, onSelect }: EventBarProps = $props();

	let cal = $derived(getTranslation(language.current).pages.calendar);

	let left = $derived((segment.colOffset / 7) * 100);
	let width = $derived((segment.colSpan / 7) * 100);

	/**
	 * The organiser's dates do not make sense, so where this bar sits is a guess.
	 * Said out loud rather than silently trusted — see `hasReversedDates`.
	 */
	let suspect = $derived(hasReversedDates(segment.tournament));

	let title = $derived(
		[
			segment.tournament.name,
			segment.startOnly ? `(${cal.longerEvent})` : '',
			suspect ? `— ${cal.reversedDates}` : ''
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<button
	type="button"
	onclick={(event) => {
		event.stopPropagation();
		onSelect(segment.tournament, rowStartDayNumber + segment.colOffset);
	}}
	{title}
	style="position: absolute; top: {top}px; height: {height}px; left: calc({left}% + 2px); width: calc({width}% - 4px)"
	class="flex items-center gap-0.5 overflow-hidden rounded border px-1 text-left text-[10px] leading-none transition-opacity hover:opacity-80 sm:text-xs {barClasses(
		segment.tournament.type
	)}"
>
	{#if segment.continuesLeft}<span aria-hidden="true" class="shrink-0">◀</span>{/if}
	{#if segment.startOnly}<span aria-hidden="true" class="shrink-0 opacity-70">•</span>{/if}
	{#if suspect}
		<span class="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true">⚠</span>
	{/if}
	<span class="truncate">{segment.tournament.name}</span>
	{#if segment.continuesRight}<span aria-hidden="true" class="ml-auto shrink-0">▶</span>{/if}
</button>
