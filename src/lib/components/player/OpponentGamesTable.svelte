<script lang="ts">
	/**
	 * Every game a player has played, one row each.
	 * Ports `components/player/OpponentGamesTable.tsx`.
	 *
	 * The opponent's name is a button rather than a link: clicking it opens the
	 * head-to-head tab beside this one instead of navigating away. The player's
	 * own name is plain text, on whichever side they had.
	 */
	import Link from '$lib/components/ui/Link.svelte';
	import Table from '$lib/components/ui/Table/Table.svelte';
	import type { TableColumn } from '$lib/components/ui/Table/tableTypes';
	import type { GameDisplay } from '$lib/api';
	import { getPlayerProfileState } from '$lib/stores/playerProfile.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface OpponentGamesTableProps {
		games: GameDisplay[];
		loading?: boolean;
	}

	let { games, loading = false }: OpponentGamesTableProps = $props();

	const profile = getPlayerProfileState();

	let t = $derived(getTranslation(language.current));
	let ot = $derived(t.pages.playerDetail.opponentsTab);

	let memberId = $derived(profile.memberId);

	/** Long names would push the result and tournament columns off a phone. */
	const TITLE_LIMIT = 50;
	const shorten = (name: string) =>
		name.length > TITLE_LIMIT ? `${name.substring(0, TITLE_LIMIT)}...` : name;

	let columns = $derived([
		{ id: 'white', header: ot.table.white, cell: whiteCell, align: 'left' },
		{ id: 'black', header: ot.table.black, cell: blackCell, align: 'left' },
		{
			id: 'result',
			header: ot.table.result,
			accessor: 'result',
			align: 'center',
			noWrap: true,
			cellClassName: 'font-mono'
		},
		{ id: 'tournament', header: ot.table.tournament, cell: tournamentCell, align: 'left' }
	] satisfies TableColumn<GameDisplay>[]);
</script>

{#snippet side(id: number, name: string)}
	{#if id === memberId}
		<span class="font-medium">{name}</span>
	{:else}
		<button
			type="button"
			onclick={() => profile.setSelectedOpponent(id, name)}
			class="text-left text-blue-600 transition-colors hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
		>
			{name}
		</button>
	{/if}
{/snippet}

{#snippet whiteCell(game: GameDisplay)}
	{@render side(game.whiteId, game.whiteName)}
{/snippet}

{#snippet blackCell(game: GameDisplay)}
	{@render side(game.blackId, game.blackName)}
{/snippet}

{#snippet tournamentCell(game: GameDisplay)}
	<Link href="/results/{game.tournamentId}/{game.groupId}" class="block max-w-md truncate">
		<span title={game.tournamentName}>{shorten(game.tournamentName)}</span>
	</Link>
{/snippet}

<Table
	data={games}
	{columns}
	{loading}
	emptyMessage={ot.noOpponents}
	loadingMessage={ot.loading}
	getRowKey={(game) => game.gameId}
	hover
	striped={false}
	border
/>
