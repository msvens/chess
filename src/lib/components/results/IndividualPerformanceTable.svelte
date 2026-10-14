<script lang="ts">
	/**
	 * The tournament-wide performance list, in the official list's order and
	 * columns: rank, name, club, games, won / drawn / lost, points, PERF.
	 *
	 * Not sortable — the order is the ranking. A player has one row for the
	 * whole tournament, even across divisions; the name links to their games in
	 * the group they played most in.
	 */
	import Link from '$lib/components/ui/Link.svelte';
	import Table from '$lib/components/ui/Table/Table.svelte';
	import type { TableColumn } from '$lib/components/ui/Table/tableTypes';
	import { formatPlayerName, type IndividualPerformanceRow, type PlayerInfoDto } from '$lib/api';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface IndividualPerformanceTableProps {
		rows: IndividualPerformanceRow[];
		tournamentId: number;
		/** The player's record, for the name. */
		playerOf: (playerId: number) => PlayerInfoDto | undefined;
		/** The club beside the name — in a team event, the club of the team they played for. */
		clubOf: (playerId: number) => string | undefined;
	}

	let { rows, tournamentId, playerOf, clubOf }: IndividualPerformanceTableProps = $props();

	let tr = $derived(getTranslation(language.current).pages.tournamentResults);
	let labels = $derived(tr.finalResultsTable);

	let rankOf = $derived(new Map(rows.map((row, index) => [row, index + 1])));

	function nameOf(playerId: number): string {
		const player = playerOf(playerId);
		return player
			? formatPlayerName(player.firstName, player.lastName, player.elo?.title)
			: tr.unknownPlayer;
	}

	const centered = { align: 'center', noWrap: true } as const;

	let columns = $derived<TableColumn<IndividualPerformanceRow>[]>([
		{ id: 'pos', header: labels.pos, accessor: (row) => rankOf.get(row), noWrap: true },
		{ id: 'name', header: labels.name, cell: nameCell },
		{
			id: 'club',
			header: labels.club,
			accessor: (row) => clubOf(row.playerId) || '-',
			// Club names are long and the least important column on a phone; clip
			// rather than let them push the score columns off-screen.
			cellClassName:
				'max-w-[9ch] sm:max-w-none overflow-hidden whitespace-nowrap sm:whitespace-normal'
		},
		{ id: 'games', header: labels.gp, accessor: (row) => row.games, ...centered },
		{ id: 'won', header: labels.won, accessor: (row) => row.won, ...centered },
		{ id: 'drawn', header: labels.draw, accessor: (row) => row.drawn, ...centered },
		{ id: 'lost', header: labels.lost, accessor: (row) => row.lost, ...centered },
		{ id: 'points', header: labels.points, accessor: (row) => row.points, ...centered },
		{
			id: 'performance',
			header: tr.individualPerformance.performance,
			accessor: (row) => row.performance ?? '-',
			...centered
		}
	]);
</script>

{#snippet nameCell(row: IndividualPerformanceRow)}
	<Link href="/results/{tournamentId}/{row.groupIds[0]}/{row.playerId}" color="gray">
		{nameOf(row.playerId)}
	</Link>
{/snippet}

<Table
	data={rows}
	{columns}
	emptyMessage={tr.individualPerformance.noResults}
	loadingMessage={labels.loadingResults}
	getRowKey={(row) => row.playerId}
/>
