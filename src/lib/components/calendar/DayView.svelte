<script lang="ts">
	/**
	 * One day's events: the day view, and the list below the agenda layout's
	 * picker.
	 *
	 * A plain list at every width: the calendar has no hours, so a day is a list
	 * of tournaments, not a timetable of coloured blocks. Colour is only a dot,
	 * as in the colour key. `/today` shows the same list: it is this view, for
	 * today.
	 *
	 * The tournament's name is the row's heading, a link in the text colour; the
	 * groups playing are the blue links under it, since they are usually where a
	 * reader is going. Up to {@link LISTED_GROUPS} are listed one per line, more
	 * fold away behind a count.
	 *
	 * No ◀ ▶ as in the week grid: a day has no edge to run off, and the dates
	 * line already says when the tournament runs.
	 */
	import Link from '$lib/components/ui/Link.svelte';
	import type { PlayedEntry } from '$lib/utils/playedDays';
	import { byName } from '$lib/utils/nameOrder';
	import { groupLabel } from '$lib/components/tournaments/groupLabel';
	import { swatchClasses } from './calendarColors';
	import { formatEventRange, hasReversedDates, typeLabel } from './eventLabels';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { localeOf } from '$lib/i18n';
	import { getTranslation } from '$lib/translations';

	interface DayViewProps {
		/** The day's tournaments with their groups: `playedOn` in the calendar, `getTournamentsToday` on `/today`. */
		entries: PlayedEntry[];
		/** Said when the day is empty; the calendar's own text by default. */
		emptyText?: string;
	}

	let { entries, emptyText }: DayViewProps = $props();

	const organizations = getOrganizationsState();

	let t = $derived(getTranslation(language.current));
	let cal = $derived(t.pages.calendar);
	let typeLabels = $derived(t.components.tournamentTypeFilter);
	let locale = $derived(localeOf(language.current));

	/** A–Z, plain: a list draws nothing across days, so there is no band to keep. */
	let sorted = $derived([...entries].sort((a, b) => byName(a.tournament, b.tournament)));

	/** Up to this many groups are listed as they are; more fold away. */
	const LISTED_GROUPS = 3;

	const meta = (city: string | undefined, type: number) =>
		[city, typeLabel(type, typeLabels)].filter(Boolean).join(' · ');

	/** The organiser, or nothing: the store's "-" for an unknown one is a table placeholder. */
	const organizer = (entry: PlayedEntry) => {
		const name = organizations.getOrganizerName(
			entry.tournament.orgType,
			entry.tournament.orgNumber
		);
		return name === '-' ? '' : name;
	};
</script>

{#snippet warning()}
	<!-- Shown as entered, and marked: the app cannot know which date is wrong. -->
	<span
		class="shrink-0 text-amber-600 dark:text-amber-400"
		title={cal.reversedDates}
		aria-label={cal.reversedDates}>⚠</span
	>
{/snippet}

{#snippet groupList(entry: PlayedEntry)}
	<ul class="space-y-0.5">
		{#each entry.groups as group (group.id)}
			<li>
				<Link href="/results/{entry.tournament.id}/{group.id}">
					{groupLabel(entry.tournament, group)}
				</Link>
			</li>
		{/each}
	</ul>
{/snippet}

{#snippet markerLine(entry: PlayedEntry)}
	{#if entry.starts}
		<p class="text-xs">• {cal.dayDetails.startsToday}</p>
	{:else if entry.ends}
		<p class="text-xs">◦ {cal.dayDetails.endsToday}</p>
	{/if}
{/snippet}

{#if sorted.length === 0}
	<p class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
		{emptyText ?? cal.emptyDay}
	</p>
{:else}
	<ul
		class="divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-700 dark:border-gray-700"
	>
		{#each sorted as entry (entry.tournament.id)}
			{@const tournament = entry.tournament}
			{@const line = [meta(tournament.city, tournament.type), organizer(entry)]
				.filter(Boolean)
				.join(' · ')}
			<li class="flex gap-2.5 py-2.5">
				<span
					aria-hidden="true"
					class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full {swatchClasses(tournament.type)}"
				></span>
				<div class="min-w-0 flex-1 text-gray-600 dark:text-gray-400">
					<h3 class="flex items-start gap-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
						{#if hasReversedDates(tournament)}{@render warning()}{/if}
						<Link href="/results/{tournament.id}" color="inherit" class="min-w-0">
							{tournament.name}
						</Link>
					</h3>
					{@render markerLine(entry)}
					{#if line}<p class="text-xs">{line}</p>{/if}
					<p class="text-xs">{formatEventRange(tournament, locale)}</p>
					{#if entry.groups.length > LISTED_GROUPS}
						<details class="mt-1 text-xs">
							<summary class="cursor-pointer select-none">
								{cal.groupsPlaying.replace('{count}', String(entry.groups.length))}
							</summary>
							{@render groupList(entry)}
						</details>
					{:else if entry.groups.length > 0}
						<div class="mt-1 text-xs">{@render groupList(entry)}</div>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
{/if}
