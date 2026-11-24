<script lang="ts">
	/**
	 * The Calendar tab: a month, a week or a day, and the means to move between
	 * them. Ports `components/calendar/CalendarView.tsx`.
	 *
	 * Navigation is bounded by the data — there is no point paging into months
	 * that hold nothing, since the endpoint only returns upcoming events.
	 *
	 * The days each tournament is played are worked out once here, from its
	 * groups' round dates, and shared by every view.
	 *
	 * Month and week come in two layouts, chosen per breakpoint in
	 * `calendarConfig`: the grid, or the agenda — a picker with the picked day's
	 * events below. In the agenda the anchor is the picked day.
	 */
	import { MediaQuery } from 'svelte/reactivity';
	import AgendaPicker from './AgendaPicker.svelte';
	import CalendarNav from './CalendarNav.svelte';
	import DayView from './DayView.svelte';
	import MonthView from './MonthView.svelte';
	import WeekView from './WeekView.svelte';
	import { CALENDAR_LAYOUT, type CalendarLayouts } from './calendarConfig';
	import { initialDayMode, initialView, saveDayMode, saveView } from './calendarPrefs';
	import type { CalendarDayMode, CalendarViewMode } from './calendarPrefs';
	import type { TournamentDto } from '$lib/api';
	import {
		addDays,
		addMonths,
		buildDayRow,
		buildMonthMatrix,
		buildMonthRows,
		buildWeekCells,
		buildWeekRow,
		getEventDateBounds,
		toDayNumber
	} from '$lib/utils/calendarLayout';
	import { datedDays, playedDays } from '$lib/utils/playedDays';
	import { getAllTournamentTypes } from '$lib/utils/tournamentFilters';
	import { language } from '$lib/stores/language.svelte';
	import { formatDayRange } from '$lib/dateFormat';
	import { localeOf } from '$lib/i18n';
	import { getTranslation } from '$lib/translations';

	interface CalendarViewProps {
		tournaments: TournamentDto[];
		loading?: boolean;
		error?: string;
		/** Which layout each breakpoint gets; tests pick one. */
		layouts?: CalendarLayouts;
	}

	let {
		tournaments,
		loading = false,
		error,
		layouts = CALENDAR_LAYOUT
	}: CalendarViewProps = $props();

	// The app's mobile breakpoint, as `WeekView` and the tables use it.
	const mobile = new MediaQuery('(max-width: 767px)');
	let layout = $derived(mobile.current ? layouts.mobile : layouts.desktop);

	let cal = $derived(getTranslation(language.current).pages.calendar);
	let locale = $derived(localeOf(language.current));

	// Read at initialisation rather than restored in a mount effect, so the
	// remembered view does not flash past the default. The period always starts
	// at today; it isn't remembered.
	let view = $state<CalendarViewMode>(initialView());
	let anchor = $state<Date>(new Date());

	function changeView(next: CalendarViewMode) {
		view = next;
		saveView(next);
	}

	/** Game days, or the tournaments' dates as the calendar showed them before. */
	let dayMode = $state<CalendarDayMode>(initialDayMode());

	function changeDayMode(next: CalendarDayMode) {
		dayMode = next;
		saveDayMode(next);
	}

	function moveTo(next: Date) {
		anchor = next;
	}

	/** Today is fixed for the life of the component; the grid marks one cell. */
	const todayDayNumber = toDayNumber(new Date());

	const monthKey = (date: Date) => date.getFullYear() * 12 + date.getMonth();
	const weekStart = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));
	const weekKey = (date: Date) => toDayNumber(weekStart(date));

	let events = $derived(tournaments.map(dayMode === 'played' ? playedDays : datedDays));
	let bounds = $derived(getEventDateBounds(events));

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

	let grid = $derived(layout === 'grid' && view !== 'day');
	let agenda = $derived(layout === 'agenda' && view !== 'day');

	let monthRows = $derived(
		grid && view === 'month' ? buildMonthRows(anchor, events, todayDayNumber) : []
	);
	let weekRow = $derived(
		grid && view === 'week' ? buildWeekRow(anchor, events, todayDayNumber) : null
	);
	let pickerRows = $derived(
		agenda
			? view === 'month'
				? buildMonthMatrix(anchor, todayDayNumber)
				: [buildWeekCells(anchor, todayDayNumber)]
			: []
	);
	let dayRow = $derived(grid ? null : buildDayRow(anchor, events, todayDayNumber));

	let dayFormat = $derived(
		new Intl.DateTimeFormat(locale, {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		})
	);

	let title = $derived.by(() => {
		if (view === 'day') return dayFormat.format(anchor);
		if (view === 'month') {
			return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(anchor);
		}
		const from = weekStart(anchor);
		const to = addDays(from, 6);
		return formatDayRange(from, to, locale);
	});

	/** The anchor's position in whole periods of the view, to compare with the bounds. */
	const periodKey = (date: Date) =>
		view === 'day' ? toDayNumber(date) : view === 'month' ? monthKey(date) : weekKey(date);

	let canGoPrev = $derived(bounds !== null && periodKey(anchor) > periodKey(bounds.earliest));
	let canGoNext = $derived(bounds !== null && periodKey(anchor) < periodKey(bounds.latest));

	function step(direction: 1 | -1): Date {
		if (view === 'month') return addMonths(anchor, direction);
		return addDays(anchor, direction * (view === 'week' ? 7 : 1));
	}
</script>

<div>
	<CalendarNav
		{title}
		{view}
		onViewChange={changeView}
		{dayMode}
		onDayModeChange={changeDayMode}
		{legendTypes}
		{canGoPrev}
		{canGoNext}
		onPrev={() => moveTo(step(-1))}
		onNext={() => moveTo(step(1))}
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
	{:else if agenda && dayRow}
		<AgendaPicker
			rows={pickerRows}
			{events}
			selectedDay={toDayNumber(anchor)}
			onSelect={moveTo}
			{weekdayLabels}
		/>
		<p
			class="mt-4 mb-2 text-sm font-semibold text-gray-900 first-letter:uppercase dark:text-gray-100"
		>
			{dayFormat.format(anchor)}
		</p>
		<DayView row={dayRow} />
	{:else if dayRow}
		<DayView row={dayRow} />
	{:else if view === 'month'}
		<MonthView rows={monthRows} {events} {weekdayLabels} />
	{:else if weekRow}
		<WeekView row={weekRow} {weekdayLabels} />
	{/if}
</div>
