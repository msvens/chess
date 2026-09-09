<script lang="ts">
	/**
	 * The Calendar tab: a month or a week, and the means to move between them.
	 * Ports `components/calendar/CalendarView.tsx`.
	 *
	 * Navigation is bounded by the data — there is no point paging into months
	 * that hold nothing, since the endpoint only returns upcoming events.
	 */
	import CalendarNav from './CalendarNav.svelte';
	import MonthView from './MonthView.svelte';
	import WeekView from './WeekView.svelte';
	import { initialAnchor, initialView, saveAnchor, saveView } from './calendarPrefs';
	import type { CalendarViewMode } from './calendarPrefs';
	import type { TournamentDto } from '$lib/api';
	import {
		addDays,
		addMonths,
		buildMonthRows,
		buildWeekRow,
		getEventDateBounds,
		toDayNumber
	} from '$lib/utils/calendarLayout';
	import { getAllTournamentTypes } from '$lib/utils/tournamentFilters';
	import { language } from '$lib/stores/language.svelte';
	import { localeOf } from '$lib/i18n';
	import { getTranslation } from '$lib/translations';

	interface CalendarViewProps {
		tournaments: TournamentDto[];
		loading?: boolean;
		error?: string;
	}

	let { tournaments, loading = false, error }: CalendarViewProps = $props();

	let cal = $derived(getTranslation(language.current).pages.calendar);
	let locale = $derived(localeOf(language.current));

	// Read at initialisation rather than restored in a mount effect, so the
	// remembered view and month do not flash past the defaults.
	let view = $state<CalendarViewMode>(initialView());
	let anchor = $state<Date>(initialAnchor());

	function changeView(next: CalendarViewMode) {
		view = next;
		saveView(next);
	}

	function moveTo(next: Date) {
		anchor = next;
		saveAnchor(next);
	}

	/** Today is fixed for the life of the component; the grid marks one cell. */
	const todayDayNumber = toDayNumber(new Date());

	const monthKey = (date: Date) => date.getFullYear() * 12 + date.getMonth();
	const weekStart = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));
	const weekKey = (date: Date) => toDayNumber(weekStart(date));

	let bounds = $derived(getEventDateBounds(tournaments));

	/** Only the types on screen get a colour key entry, in canonical order. */
	let legendTypes = $derived.by(() => {
		const present = new Set(tournaments.map((tournament) => tournament.type));
		return getAllTournamentTypes().filter((type) => present.has(type));
	});

	/** Mon–Sun, taken from a date known to be a Monday. */
	let weekdayLabels = $derived.by(() => {
		const format = new Intl.DateTimeFormat(locale, { weekday: 'short' });
		const monday = new Date(2024, 0, 1);
		return Array.from({ length: 7 }, (_, index) => format.format(addDays(monday, index)));
	});

	let monthRows = $derived(
		view === 'month' ? buildMonthRows(anchor, tournaments, todayDayNumber) : []
	);
	let weekRow = $derived(
		view === 'week' ? buildWeekRow(anchor, tournaments, todayDayNumber) : null
	);

	let title = $derived.by(() => {
		if (view === 'month') {
			return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(anchor);
		}
		const from = weekStart(anchor);
		const to = addDays(from, 6);
		const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
		const full = new Intl.DateTimeFormat(locale, {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
		return `${dayMonth.format(from)} – ${full.format(to)}`;
	});

	let canGoPrev = $derived(
		bounds !== null &&
			(view === 'month'
				? monthKey(anchor) > monthKey(bounds.earliest)
				: weekKey(anchor) > weekKey(bounds.earliest))
	);
	let canGoNext = $derived(
		bounds !== null &&
			(view === 'month'
				? monthKey(anchor) < monthKey(bounds.latest)
				: weekKey(anchor) < weekKey(bounds.latest))
	);
</script>

<div>
	<CalendarNav
		{title}
		{view}
		onViewChange={changeView}
		{legendTypes}
		{canGoPrev}
		{canGoNext}
		onPrev={() => moveTo(view === 'month' ? addMonths(anchor, -1) : addDays(anchor, -7))}
		onNext={() => moveTo(view === 'month' ? addMonths(anchor, 1) : addDays(anchor, 7))}
		onToday={() => moveTo(new Date())}
		onEarliest={() => bounds && moveTo(bounds.earliest)}
		onLatest={() => bounds && moveTo(bounds.latest)}
	/>

	{#if loading}
		<div class="py-12 text-center text-gray-500 dark:text-gray-400">
			{cal.tournamentList.loading}
		</div>
	{:else if error}
		<div class="py-12 text-center text-red-600 dark:text-red-400">{error}</div>
	{:else if view === 'month'}
		<MonthView rows={monthRows} {tournaments} {weekdayLabels} />
	{:else if weekRow}
		<WeekView row={weekRow} {weekdayLabels} />
	{/if}
</div>
