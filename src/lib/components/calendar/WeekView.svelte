<script lang="ts">
	/**
	 * One week as seven columns of event cards.
	 * Ports `components/calendar/WeekView.tsx`.
	 *
	 * Cards are grid items rather than absolutely-positioned bars — a week has
	 * room for the organiser, the city and the dates, so the cards size to their
	 * content and the lane index becomes a grid row.
	 */
	import { MediaQuery } from 'svelte/reactivity';
	import Link from '$lib/components/ui/Link.svelte';
	import type { PackedRow } from '$lib/utils/calendarLayout';
	import { barClasses } from './calendarColors';
	import DayEventsPopover from './DayEventsPopover.svelte';
	import { formatEventRange, hasReversedDates, shortDateFormat, typeLabel } from './eventLabels';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { localeOf } from '$lib/i18n';
	import { getTranslation } from '$lib/translations';

	interface WeekViewProps {
		row: PackedRow;
		/** Mon–Sun, in the current language. */
		weekdayLabels: string[];
	}

	let { row, weekdayLabels }: WeekViewProps = $props();

	const organizations = getOrganizationsState();
	// Per component, never module-level: a module-level MediaQuery would be
	// created at import time, before there is a window to ask.
	const mobile = new MediaQuery('(max-width: 767px)');

	let t = $derived(getTranslation(language.current));
	let cal = $derived(t.pages.calendar);
	let typeLabels = $derived(t.components.tournamentTypeFilter);
	let dateFormat = $derived(shortDateFormat(localeOf(language.current)));

	/** Enough height to read as a week, with any slack below the cards. */
	let minBand = $derived(mobile.current ? 220 : 300);
	let rowStart = $derived(row.cells[0].dayNumber);

	let open = $state<{ tournamentId: number; colOffset: number } | null>(null);

	const meta = (city: string | undefined, type: number) =>
		[city, typeLabel(type, typeLabels)].filter(Boolean).join(' · ');
</script>

<div class="rounded-lg border border-gray-200 dark:border-gray-700">
	<div
		class="grid grid-cols-7 rounded-t-lg border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
	>
		{#each row.cells as cell, index (cell.dayNumber)}
			<div
				class="px-1 py-2 text-center {index === 6
					? ''
					: 'border-r border-gray-200 dark:border-gray-700'}"
			>
				<div
					class="text-[10px] font-medium tracking-wide text-gray-500 uppercase sm:text-xs dark:text-gray-400"
				>
					{weekdayLabels[index]}
				</div>
				<span
					class="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs sm:text-sm
						{cell.isToday
						? 'bg-blue-600 font-semibold text-white dark:bg-blue-500'
						: 'text-gray-700 dark:text-gray-300'}"
				>
					{cell.date.getDate()}
				</span>
			</div>
		{/each}
	</div>

	<div class="relative">
		<div class="pointer-events-none absolute inset-0 grid grid-cols-7">
			{#each row.cells as cell, index (cell.dayNumber)}
				<div
					class="{index === 6 ? '' : 'border-r border-gray-200 dark:border-gray-700'}
						{cell.isToday ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}"
				></div>
			{/each}
		</div>

		<div
			class="relative grid grid-cols-7 gap-1 p-1"
			style="min-height: {minBand}px; grid-auto-rows: min-content"
		>
			{#each row.segments as segment (`${segment.tournament.id}-${segment.colOffset}`)}
				{@const tournament = segment.tournament}
				{@const isOpen =
					open?.tournamentId === tournament.id && open?.colOffset === segment.colOffset}
				{@const popoverDate =
					row.cells.find((c) => c.dayNumber === rowStart + segment.colOffset)?.date ??
					row.cells[0].date}
				{@const suspect = hasReversedDates(tournament)}

				<div
					style="grid-column: {segment.colOffset +
						1} / span {segment.colSpan}; grid-row: {segment.laneIndex + 1}; {isOpen
						? 'z-index: 20;'
						: ''}"
					class="relative self-start rounded-md border px-1.5 py-1 transition-opacity hover:opacity-90 {barClasses(
						tournament.type
					)}"
				>
					<!-- Opening the card is a real button behind its content, so the link
					     on top of it stays a link. Wrapping would nest interactive
					     elements; a div with a click handler would not be reachable by
					     keyboard. -->
					<button
						type="button"
						onclick={() => (open = { tournamentId: tournament.id, colOffset: segment.colOffset })}
						aria-label={tournament.name}
						class="absolute inset-0 z-0 cursor-pointer rounded-md"
					></button>

					<span
						class="relative z-10 flex items-start gap-0.5 text-[11px] leading-tight font-semibold sm:text-xs"
					>
						{#if segment.continuesLeft}<span aria-hidden="true" class="shrink-0">◀</span>{/if}
						{#if suspect}
							<span
								class="shrink-0 text-amber-600 dark:text-amber-400"
								title={cal.reversedDates}
								aria-label={cal.reversedDates}>⚠</span
							>
						{/if}
						{#if mobile.current}
							<span class="pointer-events-none truncate">{tournament.name}</span>
						{:else}
							<Link
								href="/results/{tournament.id}"
								color="blue"
								underline="always"
								class="line-clamp-2"
							>
								{tournament.name}
							</Link>
						{/if}
						{#if segment.continuesRight}<span aria-hidden="true" class="ml-auto shrink-0">▶</span
							>{/if}
					</span>

					{#if !mobile.current}
						{@const line = meta(tournament.city, tournament.type)}
						{#if line}
							<span
								class="pointer-events-none relative z-10 mt-0.5 block truncate text-[10px] leading-tight opacity-80"
								>{line}</span
							>
						{/if}
						<span
							class="pointer-events-none relative z-10 block truncate text-[10px] leading-tight opacity-75"
						>
							{organizations.getOrganizerName(tournament.orgType, tournament.orgNumber)}
						</span>
						<span
							class="pointer-events-none relative z-10 block truncate text-[10px] leading-tight opacity-70"
						>
							{formatEventRange(tournament, dateFormat)}
						</span>
					{/if}

					{#if isOpen}
						<DayEventsPopover
							date={popoverDate}
							events={[tournament]}
							onClose={() => (open = null)}
						/>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
