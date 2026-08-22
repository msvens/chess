<script lang="ts">
	/**
	 * Team standings as they stood after a given round.
	 * Ports `components/results/TeamRoundStandingsTable.tsx`.
	 *
	 * Mirrors TeamFinalResultsTable's columns from a round snapshot. Team
	 * reconstruction is exact — match points and board points both come straight
	 * from the boards — so unlike the individual snapshot table there is no
	 * estimation badge.
	 */
	import Table from '$lib/components/ui/Table.svelte';
	import type { TableColumn, DensityThresholds, TableDensity } from '$lib/components/ui/tableTypes';
	import type { RoundStandingRow } from '$lib/api';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface TeamRoundStandingsTableProps {
		/** Rows for one round, already sorted best-first by the SDK. */
		rows: RoundStandingRow[];
		/**
		 * Built from the official team standings, so multi-team Roman numerals
		 * match the final table.
		 */
		formatTeamName: (contenderId: number, teamNumber: number) => string;
		onRowClick?: (row: RoundStandingRow) => void;
		density?: TableDensity;
		densityThresholds?: DensityThresholds;
	}

	let {
		rows,
		formatTeamName,
		onRowClick,
		density,
		densityThresholds
	}: TeamRoundStandingsTableProps = $props();

	let labels = $derived(
		getTranslation(language.current).pages.tournamentResults.teamFinalResultsTable
	);

	const teamNameOf = (row: RoundStandingRow) =>
		formatTeamName(row.contenderId, row.teamNumber ?? 0);

	let columns = $derived<TableColumn<RoundStandingRow>[]>([
		{
			id: 'pos',
			header: labels.pos,
			accessor: (row) => row.rank,
			noWrap: true,
			sortValue: (row) => row.rank
		},
		{
			id: 'team',
			header: labels.team,
			accessor: teamNameOf,
			sortValue: (row) => teamNameOf(row).toLowerCase()
		},
		{
			id: 'sp',
			header: labels.sp,
			accessor: (row) => row.gamesPlayed || '-',
			align: 'center',
			noWrap: true
		},
		{ id: 'won', header: labels.won, accessor: (row) => row.wins, align: 'center', noWrap: true },
		{
			id: 'draw',
			header: labels.draw,
			accessor: (row) => row.draws,
			align: 'center',
			noWrap: true
		},
		{
			id: 'lost',
			header: labels.lost,
			accessor: (row) => row.losses,
			align: 'center',
			noWrap: true
		},
		{
			id: 'pp',
			header: labels.pp,
			accessor: (row) => (Math.round(row.points * 2) / 2).toFixed(1),
			align: 'center',
			noWrap: true,
			sortValue: (row) => row.points
		},
		{
			id: 'mp',
			header: labels.mp,
			accessor: (row) => (row.matchPoints != null ? row.matchPoints.toFixed(2) : '-'),
			align: 'center',
			noWrap: true,
			// The Next app set `cellStyle: { fontWeight: 'medium' }` here, which is
			// not a valid CSS font-weight and never applied. Left unstyled so this
			// matches what the live site actually renders.
			sortValue: (row) => row.matchPoints ?? 0
		}
	]);
</script>

<Table
	data={rows}
	{columns}
	emptyMessage={labels.noResults}
	loadingMessage={labels.loadingResults}
	{onRowClick}
	getRowKey={(row) => `${row.contenderId}-${row.teamNumber}`}
	{density}
	{densityThresholds}
/>
