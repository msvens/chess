<script lang="ts">
	/**
	 * One standings table: the players, a column per tournament, and the season
	 * total. Ports `components/junior/JgpStandingsTable.tsx`.
	 *
	 * The numbered column headers link to each tournament, the names to each
	 * player, and the Total column is pinned right.
	 */
	import Link from '$lib/components/ui/Link.svelte';
	import Table from '$lib/components/ui/Table/Table.svelte';
	import type { TableColumn } from '$lib/components/ui/Table/tableTypes';
	import type { JgpStandingRow, JgpTable } from '$lib/api/sthlm';
	import type { JgpTournament } from '$lib/stores/jgpStandings.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface JgpStandingsTableProps {
		table: JgpTable;
		/** The season's tournaments, in column order. */
		tournaments: JgpTournament[];
	}

	let { table, tournaments }: JgpStandingsTableProps = $props();

	let t = $derived(getTranslation(language.current).pages.junior);

	const columnId = (tournament: JgpTournament) => `t${tournament.id}`;

	/** The header snippet gets its column; this is how it finds its tournament. */
	let byColumnId = $derived(
		new Map(tournaments.map((tournament, index) => [columnId(tournament), { tournament, index }]))
	);

	/**
	 * Integers plain, halves as .5. No score at all is blank, which is not the
	 * same as 0: a 0 means played in the wrong class without dispensation.
	 */
	const score = (value: number | undefined): string => {
		if (value == null) return '';
		return Number.isInteger(value) ? String(value) : value.toFixed(1);
	};

	let columns = $derived<TableColumn<JgpStandingRow>[]>([
		{
			id: 'pos',
			header: t.table.pos,
			accessor: (row) => row.placement,
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
		{ id: 'club', header: t.table.club, accessor: (row) => row.club, align: 'left' },
		...tournaments.map((tournament): TableColumn<JgpStandingRow> => ({
			id: columnId(tournament),
			headerSnippet: tournamentHeader,
			accessor: (row) => score(row.points[tournament.id]),
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
		<Link href="/results/{entry.tournament.id}" title={entry.tournament.name}>
			{entry.index + 1}
		</Link>
	{/if}
{/snippet}

<Table
	data={table.rows}
	{columns}
	getRowKey={(row) => row.memberId}
	density="compact"
	emptyMessage={t.noData}
	loadingMessage={t.loading}
/>
