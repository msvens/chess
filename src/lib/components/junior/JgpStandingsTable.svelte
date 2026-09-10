<script lang="ts">
	/**
	 * One standings table: the players, a column per tournament, and the season
	 * total. Ports `components/junior/JgpStandingsTable.tsx`.
	 *
	 * The numbered column headers link to each tournament, the names to each
	 * player, the Total column is pinned right, and heavier rules fall after
	 * ranks 10 and 20 — the A-final and B-final cut-offs.
	 */
	import Link from '$lib/components/ui/Link.svelte';
	import Table from '$lib/components/ui/Table/Table.svelte';
	import type { TableColumn } from '$lib/components/ui/Table/tableTypes';
	import type { JgpTournamentRef } from '$lib/data/jgp/types';
	import type { JgpAgeClassTable, JgpStandingRow } from '$lib/junior/jgpEngine';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface JgpStandingsTableProps {
		table: JgpAgeClassTable;
		/** The season's tournaments, in column order. */
		tournaments: JgpTournamentRef[];
	}

	let { table, tournaments }: JgpStandingsTableProps = $props();

	let t = $derived(getTranslation(language.current).pages.junior);

	const columnId = (tournament: JgpTournamentRef) => `t${tournament.tournamentId}`;

	/** The header snippet gets its column; this is how it finds its tournament. */
	let byColumnId = $derived(
		new Map(tournaments.map((tournament, index) => [columnId(tournament), { tournament, index }]))
	);

	/** Integers plain, halves as .5, no score at all blank. */
	const score = (value: number | null): string => {
		if (value == null) return '';
		return Number.isInteger(value) ? String(value) : value.toFixed(1);
	};

	let columns = $derived<TableColumn<JgpStandingRow>[]>([
		{
			id: 'pos',
			header: t.table.pos,
			accessor: (row) => row.place,
			align: 'left',
			cellClassName: 'tabular-nums'
		},
		{ id: 'name', header: t.table.name, cell: nameCell, align: 'left', noWrap: true },
		{
			id: 'born',
			header: t.table.born,
			accessor: (row) => row.birthYear,
			align: 'left',
			cellClassName: 'tabular-nums'
		},
		{ id: 'club', header: t.table.club, accessor: (row) => row.clubName, align: 'left' },
		...tournaments.map((tournament, index): TableColumn<JgpStandingRow> => ({
			id: columnId(tournament),
			headerSnippet: tournamentHeader,
			accessor: (row) => score(row.perTournament[index]),
			align: 'right',
			headerClassName: 'tabular-nums',
			cellClassName: 'tabular-nums'
		})),
		{
			id: 'total',
			header: t.table.total,
			accessor: (row) => score(row.total),
			align: 'right',
			sticky: 'right',
			headerClassName: 'tabular-nums',
			cellClassName: 'tabular-nums font-medium text-gray-900 dark:text-gray-200'
		}
	]);
</script>

{#snippet nameCell(row: JgpStandingRow)}
	<Link href="/players/{row.memberId}">{row.name}</Link>
{/snippet}

{#snippet tournamentHeader(column: TableColumn<JgpStandingRow>)}
	{@const entry = byColumnId.get(column.id)}
	{#if entry}
		<Link href="/results/{entry.tournament.tournamentId}" title={entry.tournament.label}>
			{entry.index + 1}
		</Link>
	{/if}
{/snippet}

<Table
	data={table.rows}
	{columns}
	getRowKey={(row) => row.memberId}
	rowDivider={(_row, index) => index === 9 || index === 19}
	density="compact"
	emptyMessage={t.noData}
	loadingMessage={t.loading}
/>
