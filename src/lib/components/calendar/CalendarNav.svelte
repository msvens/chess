<script lang="ts">
	/**
	 * The bar above the grid: where you are, how to move, and which view.
	 * Ports `components/calendar/CalendarNav.tsx`.
	 */
	import CalendarLegend from './CalendarLegend.svelte';
	import type { CalendarViewMode } from './calendarPrefs';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface CalendarNavProps {
		/** The period on screen, already formatted. */
		title: string;
		view: CalendarViewMode;
		onViewChange: (view: CalendarViewMode) => void;
		/** Tournament types present in the data, for the colour key. */
		legendTypes: number[];
		canGoPrev: boolean;
		canGoNext: boolean;
		onPrev: () => void;
		onNext: () => void;
		onToday: () => void;
		onEarliest: () => void;
		onLatest: () => void;
	}

	let {
		title,
		view,
		onViewChange,
		legendTypes,
		canGoPrev,
		canGoNext,
		onPrev,
		onNext,
		onToday,
		onEarliest,
		onLatest
	}: CalendarNavProps = $props();

	let cal = $derived(getTranslation(language.current).pages.calendar);
	let nav = $derived(cal.nav);

	const iconButton =
		'flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800';
</script>

<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
	<div class="flex items-center gap-1">
		<button
			type="button"
			onclick={onEarliest}
			disabled={!canGoPrev}
			title={nav.earliest}
			aria-label={nav.earliest}
			class={iconButton}>«</button
		>
		<button
			type="button"
			onclick={onPrev}
			disabled={!canGoPrev}
			title={nav.prev}
			aria-label={nav.prev}
			class={iconButton}>‹</button
		>
		<button
			type="button"
			onclick={onToday}
			class="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
		>
			{nav.today}
		</button>
		<button
			type="button"
			onclick={onNext}
			disabled={!canGoNext}
			title={nav.next}
			aria-label={nav.next}
			class={iconButton}>›</button
		>
		<button
			type="button"
			onclick={onLatest}
			disabled={!canGoNext}
			title={nav.latest}
			aria-label={nav.latest}
			class={iconButton}>»</button
		>
	</div>

	<h2
		class="order-last w-full truncate text-center text-sm font-semibold text-gray-900 capitalize sm:order-none sm:w-auto sm:flex-1 sm:text-base dark:text-gray-100"
	>
		{title}
	</h2>

	<div class="flex shrink-0 items-center gap-1.5">
		<CalendarLegend types={legendTypes} />
		<!-- The React version labelled this "Month" — one of its own two options,
		     rather than a description of the control. -->
		<select
			value={view}
			onchange={(event) => onViewChange(event.currentTarget.value as CalendarViewMode)}
			aria-label={cal.viewLabel}
			class="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
		>
			<option value="week">{cal.views.week}</option>
			<option value="month">{cal.views.month}</option>
		</select>
	</div>
</div>
