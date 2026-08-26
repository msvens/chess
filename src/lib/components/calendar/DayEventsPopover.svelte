<script lang="ts">
	/**
	 * A day's events in full, anchored inside the cell that opened it.
	 * Ports `components/calendar/DayEventsPopover.tsx`.
	 *
	 * The React version's two `useEffect` listener pairs are the `clickOutside`
	 * and `escapeKey` attachments, and its `useLayoutEffect` — which measured the
	 * node and wrote five style properties onto it — is now a measurement here
	 * plus a decision in `popoverPlacement`, which is testable on its own.
	 */
	import Link from '$lib/components/ui/Link.svelte';
	import { clickOutside } from '$lib/attachments/clickOutside';
	import { escapeKey } from '$lib/attachments/escapeKey';
	import type { TournamentDto } from '$lib/api';
	import { swatchClasses } from './calendarColors';
	import { formatEventRange, hasReversedDates, longDateFormat, typeLabel } from './eventLabels';
	import { placePopover, placementStyle } from './popoverPlacement';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { localeOf } from '$lib/i18n';
	import { getTranslation } from '$lib/translations';

	interface DayEventsPopoverProps {
		date: Date;
		events: TournamentDto[];
		onClose: () => void;
	}

	let { date, events, onClose }: DayEventsPopoverProps = $props();

	const organizations = getOrganizationsState();

	let t = $derived(getTranslation(language.current));
	let cal = $derived(t.pages.calendar);
	let details = $derived(cal.dayDetails);
	let typeLabels = $derived(t.components.tournamentTypeFilter);
	let locale = $derived(localeOf(language.current));

	let headerFormat = $derived(
		new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' })
	);
	let dateFormat = $derived(longDateFormat(locale));

	let element = $state<HTMLDivElement | null>(null);
	// Hangs below-left until measured; anything else would flash in the wrong
	// place on the way to being corrected.
	let style = $state(placementStyle({ dropUp: false, pinRight: false }));

	/**
	 * Measure once the popover is in the DOM, then place it.
	 *
	 * The decision reads the *anchor's* box, never the popover's own position, so
	 * flipping cannot change the input that caused the flip.
	 */
	$effect(() => {
		void events;
		void locale;
		const node = element;
		if (!node) return;

		const anchor = (node.parentElement ?? node).getBoundingClientRect();
		style = placementStyle(
			placePopover(
				anchor,
				{ width: node.offsetWidth, height: node.offsetHeight },
				{ width: window.innerWidth, height: window.innerHeight }
			)
		);
	});
</script>

<div
	bind:this={element}
	onclick={(event) => event.stopPropagation()}
	onkeydown={(event) => event.stopPropagation()}
	role="dialog"
	aria-label={headerFormat.format(date)}
	tabindex="-1"
	{style}
	class="absolute z-30 w-64 max-w-[80vw] rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800"
	{@attach clickOutside(onClose)}
	{@attach escapeKey(onClose)}
>
	<div class="mb-2 text-sm font-semibold text-gray-900 capitalize dark:text-gray-100">
		{headerFormat.format(date)}
	</div>

	<ul class="flex max-h-80 flex-col gap-3 overflow-y-auto">
		{#each events as tournament (tournament.id)}
			<li class="flex gap-2">
				<span
					aria-hidden="true"
					class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full {swatchClasses(tournament.type)}"
				></span>
				<div class="min-w-0 flex-1">
					<Link href="/results/{tournament.id}" class="block truncate text-sm font-medium">
						{tournament.name}
					</Link>
					<dl class="mt-1 space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
						<div class="flex gap-1">
							<dt class="shrink-0 font-medium">{details.organizer}:</dt>
							<dd class="truncate">
								{organizations.getOrganizerName(tournament.orgType, tournament.orgNumber)}
							</dd>
						</div>
						{#if tournament.city}
							<div class="flex gap-1">
								<dt class="shrink-0 font-medium">{details.city}:</dt>
								<dd class="truncate">{tournament.city}</dd>
							</div>
						{/if}
						{#if typeLabel(tournament.type, typeLabels)}
							<div class="flex gap-1">
								<dt class="shrink-0 font-medium">{details.type}:</dt>
								<dd class="truncate">{typeLabel(tournament.type, typeLabels)}</dd>
							</div>
						{/if}
						<div class="flex gap-1">
							<dt class="shrink-0 font-medium">{details.dateRange}:</dt>
							<dd>
								{formatEventRange(tournament, dateFormat)}
								{#if hasReversedDates(tournament)}
									<!-- Shown as entered, and marked: the app cannot know which of
									     the two dates is the wrong one. -->
									<span
										class="text-amber-600 dark:text-amber-400"
										title={cal.reversedDates}
										aria-label={cal.reversedDates}>⚠</span
									>
								{/if}
							</dd>
						</div>
					</dl>
				</div>
			</li>
		{/each}
	</ul>
</div>
