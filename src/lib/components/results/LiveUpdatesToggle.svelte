<script lang="ts">
	/**
	 * Poll-for-updates switch, a manual refresh, and when the data last changed.
	 * Ports `components/results/LiveUpdatesToggle.tsx`.
	 */
	import { ArrowPath, Icon } from 'svelte-hero-icons';
	import { localeOf } from '$lib/i18n';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface LiveUpdatesToggleProps {
		enabled: boolean;
		onToggle: (enabled: boolean) => void;
		/** Epoch ms of the last successful fetch, or null before the first one. */
		lastUpdated: number | null;
		isRefreshing: boolean;
		onManualRefresh: () => void;
	}

	let { enabled, onToggle, lastUpdated, isRefreshing, onManualRefresh }: LiveUpdatesToggleProps =
		$props();

	let t = $derived(getTranslation(language.current).pages.tournamentResults.liveUpdates);
	let locale = $derived(localeOf(language.current));
	let updatedAt = $derived(
		lastUpdated === null
			? null
			: new Date(lastUpdated).toLocaleTimeString(locale, {
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit'
				})
	);
</script>

<div class="flex items-center gap-3 text-sm">
	<button
		onclick={onManualRefresh}
		disabled={isRefreshing}
		class="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800"
		title={t.refresh}
		aria-label={t.refresh}
	>
		<Icon src={ArrowPath} class="h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" aria-hidden="true" />
	</button>

	<label class="flex cursor-pointer items-center gap-2 select-none">
		<span
			class="transition-colors {enabled
				? 'font-medium text-green-600 dark:text-green-400'
				: 'text-gray-600 dark:text-gray-400'}"
		>
			{t.label}
		</span>
		<div class="relative">
			<input
				type="checkbox"
				checked={enabled}
				onchange={(e) => onToggle(e.currentTarget.checked)}
				class="peer sr-only"
			/>
			<div
				class="peer h-5 w-9 rounded-full bg-gray-200 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700 dark:peer-focus:ring-offset-dark-bg"
			></div>
		</div>
	</label>

	{#if updatedAt}
		<span class="text-xs text-gray-500 dark:text-gray-500">{t.lastUpdated}: {updatedAt}</span>
	{/if}
</div>
