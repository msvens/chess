<script lang="ts">
	/**
	 * Search for a player by name, and pick one from the results.
	 * Ports `components/PlayerSearchInput.tsx`.
	 *
	 * Not type-ahead: the search runs on Enter or the button, so there is no
	 * debounce. Every string is a prop — this reads as a `ui/` component even
	 * though it lives under `player/`, because the SSF name search is the only
	 * player-specific thing about it.
	 */
	import TextField from '$lib/components/ui/TextField.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { clickOutside } from '$lib/attachments/clickOutside';
	import { escapeKey } from '$lib/attachments/escapeKey';
	import { PlayerService, formatPlayerName, type PlayerInfoDto } from '$lib/api';

	interface PlayerSearchInputProps {
		onSelect: (player: PlayerInfoDto) => void;
		placeholder: string;
		searchLabel: string;
		/** Shown when the search returns nobody, and when it fails. */
		noResultsMessage: string;
		label?: string;
		/** Standing hint under the field, e.g. how to type a name. */
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
	}: PlayerSearchInputProps = $props();

	// Module-scope would be shared across instances, which is fine, but one per
	// component is cheap and keeps the lifetime obvious. Either way, not one per
	// render as the React version had.
	const players = new PlayerService();

	let query = $state('');
	let results = $state<PlayerInfoDto[]>([]);
	let searching = $state(false);
	let showDropdown = $state(false);
	let message = $state('');

	/**
	 * A typed query as the API wants it.
	 *
	 * Split on the *first* space: what precedes it is the first name, everything
	 * after is the surname — so "Anna Maria Svensson" searches for a first name
	 * of "Anna". With no space at all the whole string is the surname, which is
	 * the common case: people search by surname.
	 */
	function nameParts(raw: string): { firstName: string; lastName: string } {
		const trimmed = raw.trim();
		const space = trimmed.indexOf(' ');
		if (space === -1) return { firstName: '', lastName: trimmed };
		return { firstName: trimmed.slice(0, space), lastName: trimmed.slice(space + 1) };
	}

	async function search() {
		const trimmed = query.trim();
		if (!trimmed) return;

		searching = true;
		message = '';
		showDropdown = false;

		const { firstName, lastName } = nameParts(trimmed);
		try {
			const response = await players.searchPlayer(firstName, lastName);
			if (response.status === 200 && response.data && response.data.length > 0) {
				results = response.data;
				showDropdown = true;
			} else {
				results = [];
				message = noResultsMessage;
			}
		} catch {
			// Defensive only: the SDK does not throw, it resolves with a status —
			// a dead host answers `{ status: 0, error: 'fetch failed' }`, which the
			// branch above already handles. The React version hardcoded English
			// here; using the prop costs nothing and removes the trap if the SDK's
			// contract ever changes.
			results = [];
			message = noResultsMessage;
		} finally {
			searching = false;
		}
	}

	function choose(player: PlayerInfoDto) {
		query = nameOf(player);
		showDropdown = false;
		message = '';
		onSelect(player);
	}

	const nameOf = (player: PlayerInfoDto) =>
		formatPlayerName(player.firstName, player.lastName, player.elo?.title);
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
			<!-- Past eight results the list scrolls; below that it sizes to content
			     so a two-hit search is not a tall empty box. -->
			<div
				class="overflow-y-auto"
				style="scrollbar-width: thin; scrollbar-color: #d1d5db transparent; max-height: {results.length >
				8
					? '320px'
					: 'auto'}"
			>
				{#each results as player, index (player.id)}
					<button
						type="button"
						onclick={() => choose(player)}
						class="relative block w-full px-3 py-2 text-left text-sm whitespace-nowrap text-gray-900 transition-colors hover:bg-white/10 focus:outline-none dark:text-gray-200 dark:hover:bg-white/10"
					>
						<div>
							{nameOf(player)}
							{#if player.club}
								<span class="ml-2 text-gray-500 dark:text-gray-400">({player.club})</span>
							{/if}
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
