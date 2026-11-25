<script lang="ts">
	/**
	 * One day's events: the day view, and the list below the agenda layout's
	 * picker.
	 *
	 * A plain list at every width: the calendar has no hours, so a day is a list
	 * of tournaments, not a timetable of coloured blocks. Colour is only a dot,
	 * as in the colour key. Each row lists the groups playing, as `/today` does:
	 * up to {@link LISTED_GROUPS} one per line, more folded away behind a count.
	 *
	 * No ◀ ▶ as in the week grid: a day has no edge to run off, and the dates
	 * line already says when the tournament runs.
	 */
	import Link from '$lib/components/ui/Link.svelte';
	import type { PackedRow, PositionedSegment } from '$lib/utils/calendarLayout';
	import { groupLabel } from '$lib/components/tournaments/groupLabel';
	import { swatchClasses } from './calendarColors';
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

	let t = $derived(getTranslation(language.current));
	let cal = $derived(t.pages.calendar);
	let typeLabels = $derived(t.components.tournamentTypeFilter);
	let locale = $derived(localeOf(language.current));

	let segments = $derived([...row.segments].sort((a, b) => a.laneIndex - b.laneIndex));

	/** Up to this many groups are listed as they are; more fold away. */
	const LISTED_GROUPS = 3;

	const meta = (city: string | undefined, type: number) =>
		[city, typeLabel(type, typeLabels)].filter(Boolean).join(' · ');

	const organizer = (segment: PositionedSegment) =>
		organizations.getOrganizerName(segment.tournament.orgType, segment.tournament.orgNumber);
</script>

{#snippet warning()}
	<!-- Shown as entered, and marked: the app cannot know which date is wrong. -->
	<span
		class="shrink-0 text-amber-600 dark:text-amber-400"
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
{:else}
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
{/if}
