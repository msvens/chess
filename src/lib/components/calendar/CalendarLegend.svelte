<script lang="ts">
	/**
	 * The colour key, on demand.
	 * Ports `components/calendar/CalendarLegend.tsx`.
	 *
	 * Lists the types it is given: every type, on the calendar and /today, so
	 * a colour can be looked up whatever is on screen; none hides the button.
	 * Its two `useEffect` listener pairs are the `clickOutside` and `escapeKey`
	 * attachments.
	 *
	 * The panel opens rightwards from the button's left edge: on a phone the
	 * controls wrap to the left of the screen, where a panel opening leftwards
	 * ran off it.
	 */
	import { clickOutside } from '$lib/attachments/clickOutside';
	import { escapeKey } from '$lib/attachments/escapeKey';
	import { swatchClasses } from './calendarColors';
	import { typeLabel } from './eventLabels';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface CalendarLegendProps {
		/** The types to list, in canonical order. */
		types: number[];
		/** Which edge of the button the panel lines up with: `end` for a button at the right of the screen. */
		align?: 'start' | 'end';
	}

	let { types, align = 'start' }: CalendarLegendProps = $props();

	let t = $derived(getTranslation(language.current));
	let cal = $derived(t.pages.calendar);
	let typeLabels = $derived(t.components.tournamentTypeFilter);

	let open = $state(false);
</script>

{#if types.length > 0}
	<div
		class="relative shrink-0"
		{@attach clickOutside(() => (open = false))}
		{@attach escapeKey(() => (open = false))}
	>
		<button
			type="button"
			onclick={() => (open = !open)}
			aria-label={cal.colors}
			aria-expanded={open}
			class="flex h-8 items-center gap-1.5 rounded-md border border-gray-200 px-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 md:text-sm dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
		>
			<span aria-hidden="true" class="flex gap-0.5">
				<span class="h-2 w-2 rounded-full bg-rose-500"></span>
				<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
				<span class="h-2 w-2 rounded-full bg-blue-500"></span>
			</span>
			<span class="hidden sm:inline">{cal.colors}</span>
		</button>

		{#if open}
			<div
				class="absolute top-full z-30 mt-1 w-48 {align === 'end'
					? 'right-0'
					: 'left-0'} rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
			>
				<ul class="flex flex-col gap-1.5">
					{#each types as type (type)}
						<li class="flex items-center gap-2 text-xs text-gray-700 md:text-sm dark:text-gray-300">
							<span
								aria-hidden="true"
								class="h-2.5 w-2.5 shrink-0 rounded-full {swatchClasses(type)}"
							></span>
							<span class="truncate">{typeLabel(type, typeLabels)}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
{/if}
