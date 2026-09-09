<script lang="ts">
	/**
	 * A month as six week rows, with event bars overlaid.
	 * Ports `components/calendar/MonthView.tsx`.
	 *
	 * Rows come pre-packed from `calendarLayout`: which segments exist, how wide
	 * they are and which lane each sits in. What is left here is turning lanes
	 * into pixels and deciding what a click opens.
	 */
	import { MONTH_MAX_LANES, tournamentsForDay, type PackedRow } from '$lib/utils/calendarLayout';
	import type { TournamentDto } from '$lib/api';
	import EventBar from './EventBar.svelte';
	import DayEventsPopover from './DayEventsPopover.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { localeOf } from '$lib/i18n';
	import { getTranslation } from '$lib/translations';

	interface MonthViewProps {
		rows: PackedRow[];
		tournaments: TournamentDto[];
		/** Mon–Sun, in the current language. */
		weekdayLabels: string[];
	}

	let { rows, tournaments, weekdayLabels }: MonthViewProps = $props();

	let cal = $derived(getTranslation(language.current).pages.calendar);

	/** For the cells' accessible names — the grid itself carries no date text. */
	let dayFormat = $derived(
		new Intl.DateTimeFormat(localeOf(language.current), {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		})
	);

	const HEADER_H = 24; // room for the date number
	const LANE_H = 20; // one bar lane
	const BAR_H = 17;
	const PAD_B = 6;
	const MIN_ROW = 96; // keeps the grid calendar-shaped even in a quiet month

	/** `tournamentId: null` opens the whole day; an id opens just that event. */
	let open = $state<{ day: number; tournamentId: number | null } | null>(null);

	let openDate = $derived.by(() => {
		if (!open) return null;
		for (const row of rows) {
			const cell = row.cells.find((c) => c.dayNumber === open?.day);
			if (cell) return cell.date;
		}
		return null;
	});

	let openEvents = $derived.by(() => {
		if (!open) return [];
		if (open.tournamentId !== null) {
			const match = tournaments.find((t) => t.id === open?.tournamentId);
			return match ? [match] : [];
		}
		return tournamentsForDay(tournaments, open.day);
	});

	/** Bars drawn, per day, versus events actually on that day. */
	function overflowFor(row: PackedRow): number[] {
		const rowStart = row.cells[0].dayNumber;
		return row.cells.map((cell) => {
			const total = tournamentsForDay(tournaments, cell.dayNumber).length;
			const shown = row.segments.filter(
				(segment) =>
					segment.laneIndex < MONTH_MAX_LANES &&
					cell.dayNumber >= rowStart + segment.colOffset &&
					cell.dayNumber < rowStart + segment.colOffset + segment.colSpan
			).length;
			return Math.max(0, total - shown);
		});
	}
</script>

<div class="rounded-lg border border-gray-200 dark:border-gray-700">
	<div
		class="grid grid-cols-7 rounded-t-lg border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
	>
		{#each weekdayLabels as label (label)}
			<div
				class="px-1 py-1.5 text-center text-[10px] font-medium tracking-wide text-gray-500 uppercase sm:text-xs dark:text-gray-400"
			>
				{label}
			</div>
		{/each}
	</div>

	{#each rows as row, rowIndex (rowIndex)}
		{@const lanes = Math.min(row.maxLanes, MONTH_MAX_LANES)}
		{@const rowStart = row.cells[0].dayNumber}
		{@const overflow = overflowFor(row)}
		{@const hasOverflow = overflow.some((n) => n > 0)}
		{@const minHeight = Math.max(
			MIN_ROW,
			HEADER_H + lanes * LANE_H + (hasOverflow ? LANE_H : 0) + PAD_B
		)}

		<div class="relative grid grid-cols-7" style="min-height: {minHeight}px">
			{#each row.cells as cell, colIndex (cell.dayNumber)}
				{@const dayEvents = tournamentsForDay(tournaments, cell.dayNumber)}
				<div
					class="relative border-r border-b border-gray-200 last:border-r-0 dark:border-gray-700
						{colIndex === 6 ? 'border-r-0' : ''}
						{cell.inCurrentMonth ? '' : 'bg-gray-50/60 dark:bg-gray-800/30'}"
				>
					<!-- The whole cell is the click target, so it is a real button —
					     sitting *behind* the content rather than wrapping it, because the
					     bars and the "+N more" control are buttons too and buttons cannot
					     nest. Same target, same look, and reachable by keyboard. -->
					{#if dayEvents.length > 0}
						<button
							type="button"
							onclick={() => (open = { day: cell.dayNumber, tournamentId: null })}
							aria-label={cal.dayEvents
								.replace('{count}', String(dayEvents.length))
								.replace('{date}', dayFormat.format(cell.date))}
							class="absolute inset-0 z-0 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
						></button>
					{/if}

					<div class="pointer-events-none relative z-10 px-1.5 pt-1">
						<span
							class="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] sm:text-xs
								{cell.isToday
								? 'bg-blue-600 font-semibold text-white dark:bg-blue-500'
								: cell.inCurrentMonth
									? 'text-gray-700 dark:text-gray-300'
									: 'text-gray-400 dark:text-gray-600'}"
						>
							{cell.date.getDate()}
						</span>
					</div>

					{#if overflow[colIndex] > 0}
						<button
							type="button"
							onclick={(event) => {
								event.stopPropagation();
								open = { day: cell.dayNumber, tournamentId: null };
							}}
							style="top: {HEADER_H + lanes * LANE_H}px"
							class="absolute left-1 z-20 text-[10px] font-medium text-gray-500 hover:text-blue-600 sm:text-[11px] dark:text-gray-400 dark:hover:text-blue-400"
						>
							{cal.moreEvents.replace('{count}', String(overflow[colIndex]))}
						</button>
					{/if}

					{#if open?.day === cell.dayNumber && openDate}
						<DayEventsPopover date={openDate} events={openEvents} onClose={() => (open = null)} />
					{/if}
				</div>
			{/each}

			{#each row.segments.filter((s) => s.laneIndex < MONTH_MAX_LANES) as segment (`${segment.tournament.id}-${segment.colOffset}`)}
				<EventBar
					{segment}
					rowStartDayNumber={rowStart}
					top={HEADER_H + segment.laneIndex * LANE_H}
					height={BAR_H}
					onSelect={(tournament, dayNumber) =>
						(open = { day: dayNumber, tournamentId: tournament.id })}
				/>
			{/each}
		</div>
	{/each}
</div>
