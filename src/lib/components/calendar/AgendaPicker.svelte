<script lang="ts">
	/**
	 * The agenda layout's picker: a month of day numbers, or a week strip, with a
	 * dot per tournament type played that day. Picking a day shows its events
	 * below, in `DayView`.
	 *
	 * The dots follow the day mode like the grid's bars do: game days, or the
	 * tournaments' dates with their start and end markers.
	 */
	import type { DayCell } from '$lib/utils/calendarLayout';
	import { playedOn, type CalendarEvent } from '$lib/utils/playedDays';
	import { getAllTournamentTypes } from '$lib/utils/tournamentFilters';
	import { swatchClasses } from './calendarColors';
	import { language } from '$lib/stores/language.svelte';
	import { localeOf } from '$lib/i18n';
	import { getTranslation } from '$lib/translations';

	interface AgendaPickerProps {
		/** The month's six rows, or the week as one. */
		rows: DayCell[][];
		events: CalendarEvent[];
		/** Day number of the day whose events are shown. */
		selectedDay: number;
		onSelect: (date: Date) => void;
		/** Mon–Sun, in the current language. */
		weekdayLabels: string[];
	}

	let { rows, events, selectedDay, onSelect, weekdayLabels }: AgendaPickerProps = $props();

	/** More than this many types on a day still shows this many dots. */
	const MAX_DOTS = 3;
	const TYPE_ORDER = getAllTournamentTypes();

	let cal = $derived(getTranslation(language.current).pages.calendar);
	let locale = $derived(localeOf(language.current));
	let dayFormat = $derived(
		new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' })
	);

	/** A week strip names each day on its button; a month has a header row. */
	let isWeek = $derived(rows.length === 1);

	/** The distinct types played, in the colour key's order; unknown types last. */
	function typesOn(day: number): number[] {
		const types = [...new Set(playedOn(events, day).map((entry) => entry.tournament.type))];
		const rank = (type: number) => {
			const index = TYPE_ORDER.indexOf(type);
			return index === -1 ? TYPE_ORDER.length : index;
		};
		return types.sort((a, b) => rank(a) - rank(b));
	}

	function label(cell: DayCell): string {
		const count = playedOn(events, cell.dayNumber).length;
		const date = dayFormat.format(cell.date);
		return count > 0
			? cal.dayEvents.replace('{count}', String(count)).replace('{date}', date)
			: date;
	}
</script>

<div class="rounded-lg border border-gray-200 p-1 dark:border-gray-700">
	{#if !isWeek}
		<div class="grid grid-cols-7">
			{#each weekdayLabels as weekday (weekday)}
				<div
					class="py-1 text-center text-[10px] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400"
				>
					{weekday}
				</div>
			{/each}
		</div>
	{/if}

	{#each rows as cells, rowIndex (rowIndex)}
		<div class="grid grid-cols-7 gap-0.5">
			{#each cells as cell, index (cell.dayNumber)}
				{@const selected = cell.dayNumber === selectedDay}
				{@const types = typesOn(cell.dayNumber)}
				<button
					type="button"
					onclick={() => onSelect(cell.date)}
					aria-label={label(cell)}
					aria-pressed={selected}
					class="flex flex-col items-center rounded-lg py-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800
						{selected ? 'ring-2 ring-blue-500 ring-inset dark:ring-blue-400' : ''}"
				>
					{#if isWeek}
						<span
							class="text-[10px] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400"
						>
							{weekdayLabels[index]}
						</span>
					{/if}
					<span
						class="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm
							{cell.isToday
							? 'bg-blue-600 font-semibold text-white dark:bg-blue-500'
							: cell.inCurrentMonth || isWeek
								? 'text-gray-800 dark:text-gray-200'
								: 'text-gray-400 dark:text-gray-600'}"
					>
						{cell.date.getDate()}
					</span>
					<span class="mt-0.5 flex h-1.5 gap-0.5" aria-hidden="true">
						{#each types.slice(0, MAX_DOTS) as type (type)}
							<span class="h-1.5 w-1.5 rounded-full {swatchClasses(type)}"></span>
						{/each}
					</span>
				</button>
			{/each}
		</div>
	{/each}
</div>
