<script lang="ts">
	/**
	 * Search FIDE's rating list by name, and pick one of the hits.
	 * Ports `components/FidePlayerSearchInput.tsx`.
	 *
	 * The twin of `PlayerSearchInput`: same shape, different upstream (ChessTools
	 * takes one free-text query rather than SSF's first/last name pair) and a
	 * different row (country and rating beside the name, not the club). Kept as
	 * two components rather than one with a strategy prop — a third search would
	 * be the moment to generalise.
	 */
	import TextField from '$lib/components/ui/TextField.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { clickOutside } from '$lib/attachments/clickOutside';
	import { escapeKey } from '$lib/attachments/escapeKey';
	import { fideService, type FidePlayer } from '$lib/api';
	import { formatFideSearchHitName } from '$lib/fideNames';

	interface FidePlayerSearchInputProps {
		onSelect: (player: FidePlayer) => void;
		placeholder: string;
		searchLabel: string;
		/** Shown when the search returns nobody, and when it fails. */
		noResultsMessage: string;
		label?: string;
		/** Standing hint under the field. */
		helperText?: string;
		compact?: boolean;
		fullWidth?: boolean;
	}

	let {
		onSelect,
		placeholder,
		searchLabel,
		noResultsMessage,
		label,
		helperText,
		compact = false,
		fullWidth = false
	}: FidePlayerSearchInputProps = $props();

	let query = $state('');
	let results = $state<FidePlayer[]>([]);
	let searching = $state(false);
	let showDropdown = $state(false);
	let message = $state('');

	async function search() {
		const trimmed = query.trim();
		if (!trimmed) return;

		searching = true;
		message = '';
		showDropdown = false;

		// No try/catch: the SDK resolves with a status rather than throwing.
		const response = await fideService.searchPlayers(trimmed);
		if (response.status === 200 && response.data && response.data.length > 0) {
			results = response.data;
			showDropdown = true;
		} else {
			results = [];
			message = noResultsMessage;
		}
		searching = false;
	}

	function choose(player: FidePlayer) {
		query = formatFideSearchHitName(player);
		showDropdown = false;
		message = '';
		onSelect(player);
	}
</script>

<div
	class="relative {fullWidth ? 'w-full' : ''}"
	{@attach clickOutside(() => (showDropdown = false))}
	{@attach escapeKey(() => (showDropdown = false))}
>
	{#if label}
		<span class="mb-1 block text-xs text-gray-600 dark:text-gray-400">{label}</span>
	{/if}

	<div class="flex gap-2">
		<TextField
			value={query}
			onChange={(value) => (query = value)}
			{placeholder}
			{compact}
			fullWidth
			onEnter={search}
		/>
		<Button onclick={search} disabled={searching || !query.trim()} variant="outlined" {compact}>
			{searching ? '...' : searchLabel}
		</Button>
	</div>

	{#if showDropdown && results.length > 0}
		<div
			class="absolute right-0 left-0 z-50 mt-1 overflow-hidden bg-gray-100 shadow-lg dark:bg-gray-800"
			style="box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.3), 0 4px 8px -2px rgba(0, 0, 0, 0.15)"
		>
			<div
				class="overflow-y-auto"
				style="scrollbar-width: thin; scrollbar-color: #d1d5db transparent; max-height: {results.length >
				8
					? '320px'
					: 'auto'}"
			>
				{#each results as player, index (player.fideid)}
					<button
						type="button"
						onclick={() => choose(player)}
						class="relative block w-full px-3 py-2 text-left text-sm whitespace-nowrap text-gray-900 transition-colors hover:bg-white/10 focus:outline-none dark:text-gray-200 dark:hover:bg-white/10"
					>
						<div>
							{formatFideSearchHitName(player)}
							<span class="ml-2 text-gray-500 dark:text-gray-400">
								({player.country}{player.rating ? ` • ${player.rating}` : ''})
							</span>
						</div>
						{#if index < results.length - 1}
							<div
								class="absolute right-0 bottom-0 left-0 h-px bg-gray-200 opacity-30 dark:bg-gray-700"
							></div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if message && !showDropdown}
		<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{message}</p>
	{:else if helperText && !showDropdown}
		<p class="mt-1 text-xs text-amber-600 dark:text-amber-400">{helperText}</p>
	{/if}
</div>
