<script lang="ts">
	/**
	 * A calendar popup for picking a day, or a month grid for picking a month.
	 * Ports `components/DatePicker.tsx`.
	 *
	 * Deliberately not `<input type="date">`: that renders differently in every
	 * browser and cannot show a month-only mode, which the Elo chart needs.
	 *
	 * Calendar arithmetic and locale formatting live in `datePickerLogic.ts`.
	 */
	import { untrack } from 'svelte';
	import { Calendar, ChevronLeft, ChevronRight, Icon } from 'svelte-hero-icons';
	import { clickOutside } from '$lib/attachments/clickOutside';
	import { escapeKey } from '$lib/attachments/escapeKey';
	import {
		formatDisplayDate,
		getCalendarDays,
		getMonthNames,
		getWeekdayHeaders,
		toDateString,
		toMonthString,
		viewDateFor,
		type CalendarDay
	} from './datePickerLogic';

	interface DatePickerProps {
		/** YYYY-MM-DD, or YYYY-MM in month mode. */
		value: string;
		onChange: (value: string) => void;
		mode?: 'date' | 'month';
		compact?: boolean;
		fullWidth?: boolean;
		placeholder?: string;
		/** Locale for the month and weekday names, e.g. 'sv'. */
		language?: string;
	}

	let {
		value,
		onChange,
		mode = 'date',
		compact = false,
		fullWidth = false,
		placeholder,
		language
	}: DatePickerProps = $props();

	let open = $state(false);
	// Which month the popup shows. Seeded from `value`, then the user's to browse;
	// `toggle()` re-syncs it on open, so a later change from the parent is picked up
	// then rather than yanking the view mid-browse. `untrack` states that intent.
	let viewDate = $state(viewDateFor(untrack(() => value)));

	let viewYear = $derived(viewDate.getFullYear());
	let viewMonth = $derived(viewDate.getMonth());

	let parts = $derived(value ? value.split('-').map(Number) : []);
	let selectedYear = $derived(parts[0] ?? null);
	let selectedMonth = $derived(parts[1] != null ? parts[1] - 1 : null);
	let selectedDay = $derived(mode === 'date' ? (parts[2] ?? null) : null);

	const today = new Date();
	const todayYear = today.getFullYear();
	const todayMonth = today.getMonth();
	const todayDate = today.getDate();

	let weekdays = $derived(getWeekdayHeaders(language));
	let monthNames = $derived(getMonthNames(language));
	let days = $derived(getCalendarDays(viewYear, viewMonth));
	let displayText = $derived(
		value ? formatDisplayDate(value, mode, language) : (placeholder ?? '')
	);
	let headerLabel = $derived(
		mode === 'date'
			? new Intl.DateTimeFormat(language, { year: 'numeric', month: 'long' }).format(viewDate)
			: String(viewYear)
	);

	function toggle() {
		// Reopening jumps back to the selected value's month rather than wherever
		// the user last browsed to.
		if (!open && value) viewDate = viewDateFor(value);
		open = !open;
	}

	function navigate(direction: number) {
		viewDate =
			mode === 'date'
				? new Date(viewYear, viewMonth + direction, 1)
				: new Date(viewYear + direction, viewMonth, 1);
	}

	function pickDay(day: CalendarDay) {
		onChange(toDateString(day.year, day.month, day.date));
		open = false;
	}

	function pickMonth(monthIndex: number) {
		onChange(toMonthString(viewYear, monthIndex));
		open = false;
	}

	function dayClass(day: CalendarDay) {
		const selected =
			day.isCurrentMonth &&
			day.year === selectedYear &&
			day.month === selectedMonth &&
			day.date === selectedDay;
		if (selected) return 'bg-blue-500 text-white';
		const isToday =
			day.isCurrentMonth &&
			day.year === todayYear &&
			day.month === todayMonth &&
			day.date === todayDate;
		if (isToday) return 'border border-blue-500 text-blue-600 dark:text-blue-400';
		return day.isCurrentMonth
			? 'text-gray-900 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
			: 'text-gray-300 hover:bg-gray-100 dark:text-gray-600 dark:hover:bg-gray-700';
	}
</script>

<div
	class="relative {fullWidth ? 'w-full' : ''}"
	{@attach clickOutside(() => (open = false))}
	{@attach escapeKey(() => (open = false))}
>
	<button
		type="button"
		onclick={toggle}
		aria-expanded={open}
		aria-haspopup="dialog"
		class="flex cursor-pointer items-center justify-between gap-2 rounded border border-gray-300 bg-transparent text-left hover:border-gray-900 dark:border-gray-600 dark:hover:border-white {compact
			? 'px-3 py-1.5 text-sm'
			: 'px-3 py-2'} {fullWidth ? 'w-full' : ''} {value
			? 'text-gray-900 dark:text-gray-200'
			: 'text-gray-600 dark:text-gray-400'}"
	>
		<span class="truncate">{displayText}</span>
		<Icon
			src={Calendar}
			class="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400"
			aria-hidden="true"
		/>
	</button>

	{#if open}
		<div
			class="absolute top-full left-0 z-50 mt-1 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800 {mode ===
			'date'
				? 'w-72'
				: 'w-56'}"
		>
			<div class="mb-2 flex items-center justify-between">
				<button
					type="button"
					onclick={() => navigate(-1)}
					aria-label={mode === 'date' ? 'Previous month' : 'Previous year'}
					class="rounded p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
				>
					<Icon src={ChevronLeft} class="h-4 w-4" aria-hidden="true" />
				</button>
				<span class="text-sm font-medium text-gray-900 dark:text-gray-200">{headerLabel}</span>
				<button
					type="button"
					onclick={() => navigate(1)}
					aria-label={mode === 'date' ? 'Next month' : 'Next year'}
					class="rounded p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
				>
					<Icon src={ChevronRight} class="h-4 w-4" aria-hidden="true" />
				</button>
			</div>

			{#if mode === 'date'}
				<div class="mb-1 grid grid-cols-7">
					{#each weekdays as weekday, i (i)}
						<div
							class="flex h-6 w-9 items-center justify-center text-xs text-gray-500 dark:text-gray-400"
						>
							{weekday}
						</div>
					{/each}
				</div>
				<div class="grid grid-cols-7">
					{#each days as day (`${day.year}-${day.month}-${day.date}`)}
						<button
							type="button"
							onclick={() => pickDay(day)}
							class="flex h-9 w-9 items-center justify-center rounded-full text-sm {dayClass(day)}"
						>
							{day.date}
						</button>
					{/each}
				</div>
			{:else}
				<div class="grid grid-cols-3 gap-1">
					{#each monthNames as name, i (i)}
						<button
							type="button"
							onclick={() => pickMonth(i)}
							class="rounded px-3 py-2 text-sm {viewYear === selectedYear && i === selectedMonth
								? 'bg-blue-500 text-white'
								: 'text-gray-900 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'}"
						>
							{name}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
