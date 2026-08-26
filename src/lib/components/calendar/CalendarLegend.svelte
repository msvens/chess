<script lang="ts">
	/**
	 * The colour key, on demand.
	 * Ports `components/calendar/CalendarLegend.tsx`.
	 *
	 * Lists only the types actually on screen, so filtering down to one kind of
	 * event leaves a key with one entry rather than eight. Its two `useEffect`
	 * listener pairs are the `clickOutside` and `escapeKey` attachments.
	 */
	import { clickOutside } from '$lib/attachments/clickOutside';
	import { escapeKey } from '$lib/attachments/escapeKey';
	import { swatchClasses } from './calendarColors';
	import { typeLabel } from './eventLabels';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	/** Tournament types present in the current data, in canonical order. */
	let { types }: { types: number[] } = $props();

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
			class="flex h-8 items-center gap-1.5 rounded-md border border-gray-200 px-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
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
				class="absolute top-full right-0 z-30 mt-1 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
			>
				<ul class="flex flex-col gap-1.5">
					{#each types as type (type)}
						<li class="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
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
