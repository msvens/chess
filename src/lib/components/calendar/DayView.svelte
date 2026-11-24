<script lang="ts">
	/**
	 * One day's events: the day view, and the list below the agenda layout's
	 * picker.
	 *
	 * - Wide screens: the week view's cards at full width. A card opens the day's
	 *   popover, which names the groups playing; one tap never jumps past them.
	 * - Small screens: a plain list, coloured only by a dot as in the colour key,
	 *   with the groups playing listed on each row, as `/today` lists them: up to
	 *   {@link LISTED_GROUPS} one per line, more folded away behind a count. A
	 *   popover from a list is cramped on a phone, and a stack of coloured cards
	 *   is loud.
	 *
	 * No ◀ ▶ as in the week grid: a day has no edge to run off, and the dates
	 * line already says when the tournament runs.
	 */
	import { MediaQuery } from 'svelte/reactivity';
	import Link from '$lib/components/ui/Link.svelte';
	import type { PackedRow, PositionedSegment } from '$lib/utils/calendarLayout';
	import { groupLabel } from '$lib/components/tournaments/groupLabel';
	import { barClasses, swatchClasses } from './calendarColors';
	import DayEventsPopover from './DayEventsPopover.svelte';
	import { formatEventRange, hasReversedDates, typeLabel } from './eventLabels';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { localeOf } from '$lib/i18n';
	import { getTranslation } from '$lib/translations';

	interface DayViewProps {
		/** A row of one cell, from `buildDayRow`. */
		row: PackedRow;
	}

	let { row }: DayViewProps = $props();

	const organizations = getOrganizationsState();
	// The app's mobile breakpoint. Per component, never module-level.
	const mobile = new MediaQuery('(max-width: 767px)');

	let t = $derived(getTranslation(language.current));
	let cal = $derived(t.pages.calendar);
	let typeLabels = $derived(t.components.tournamentTypeFilter);
	let locale = $derived(localeOf(language.current));

	let segments = $derived([...row.segments].sort((a, b) => a.laneIndex - b.laneIndex));
	let date = $derived(row.cells[0].date);

	/** Up to this many groups are listed as they are; more fold away. */
	const LISTED_GROUPS = 3;

	/** The card whose popover is open, by tournament. */
	let open = $state<number | null>(null);

	const meta = (city: string | undefined, type: number) =>
		[city, typeLabel(type, typeLabels)].filter(Boolean).join(' · ');

	const organizer = (segment: PositionedSegment) =>
		organizations.getOrganizerName(segment.tournament.orgType, segment.tournament.orgNumber);
</script>

{#snippet warning()}
	<!-- Shown as entered, and marked: the app cannot know which date is wrong. -->
	<span
		class="pointer-events-auto shrink-0 text-amber-600 dark:text-amber-400"
		title={cal.reversedDates}
		aria-label={cal.reversedDates}>⚠</span
	>
{/snippet}

{#snippet groupList(segment: PositionedSegment)}
	<ul class="space-y-0.5">
		{#each segment.groups as group (group.id)}
			<li>
				<Link href="/results/{segment.tournament.id}/{group.id}">
					{groupLabel(segment.tournament, group)}
				</Link>
			</li>
		{/each}
	</ul>
{/snippet}

{#snippet markerLine(segment: PositionedSegment)}
	{#if segment.marker === 'start'}
		<p class="text-xs">• {cal.dayDetails.startsToday}</p>
	{:else if segment.marker === 'end'}
		<p class="text-xs">◦ {cal.dayDetails.endsToday}</p>
	{/if}
{/snippet}

{#if segments.length === 0}
	<p class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{cal.emptyDay}</p>
{:else if mobile.current}
	<ul
		class="divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-700 dark:border-gray-700"
	>
		{#each segments as segment (segment.tournament.id)}
			{@const tournament = segment.tournament}
			{@const line = [meta(tournament.city, tournament.type), organizer(segment)]
				.filter(Boolean)
				.join(' · ')}
			<li class="flex gap-2.5 py-2.5">
				<span
					aria-hidden="true"
					class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full {swatchClasses(tournament.type)}"
				></span>
				<div class="min-w-0 flex-1 text-gray-600 dark:text-gray-400">
					<div class="flex items-start gap-1 text-sm font-medium">
						{#if hasReversedDates(tournament)}{@render warning()}{/if}
						<Link href="/results/{tournament.id}" class="min-w-0">{tournament.name}</Link>
					</div>
					{@render markerLine(segment)}
					{#if line}<p class="text-xs">{line}</p>{/if}
					<p class="text-xs">{formatEventRange(tournament, locale)}</p>
					{#if segment.groups.length > LISTED_GROUPS}
						<details class="mt-1 text-xs">
							<summary class="cursor-pointer select-none">
								{cal.groupsPlaying.replace('{count}', String(segment.groups.length))}
							</summary>
							{@render groupList(segment)}
						</details>
					{:else if segment.groups.length > 0}
						<div class="mt-1 text-xs">{@render groupList(segment)}</div>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
{:else}
	<ul class="flex flex-col gap-2">
		{#each segments as segment (segment.tournament.id)}
			{@const tournament = segment.tournament}
			{@const line = meta(tournament.city, tournament.type)}
			<li
				style={open === tournament.id ? 'z-index: 20;' : ''}
				class="relative rounded-md border px-3 py-2 transition-opacity hover:opacity-90 {barClasses(
					tournament.type
				)}"
			>
				<!-- The opener sits behind the content rather than around it, so the
				     warning's tooltip on top still takes the pointer. -->
				<button
					type="button"
					onclick={() => (open = tournament.id)}
					aria-label={tournament.name}
					class="absolute inset-0 z-0 cursor-pointer rounded-md"
				></button>

				<div class="pointer-events-none relative z-10">
					<div class="flex items-start gap-1 text-sm leading-snug font-semibold">
						{#if hasReversedDates(tournament)}{@render warning()}{/if}
						<span class="text-blue-600 underline dark:text-blue-400">{tournament.name}</span>
					</div>
					<div class="mt-0.5">{@render markerLine(segment)}</div>
					<div class="mt-0.5 space-y-0.5 text-xs leading-tight">
						{#if line}<p class="opacity-80">{line}</p>{/if}
						<p class="opacity-75">{organizer(segment)}</p>
						<p class="opacity-70">{formatEventRange(tournament, locale)}</p>
					</div>
				</div>

				{#if open === tournament.id}
					<DayEventsPopover
						{date}
						events={[
							{
								tournament,
								groups: segment.groups,
								starts: segment.marker === 'start',
								ends: segment.marker === 'end'
							}
						]}
						onClose={() => (open = null)}
					/>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
