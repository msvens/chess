<script lang="ts">
	/**
	 * Final standings for a team tournament.
	 * Ports `components/results/TeamFinalResultsTable.tsx`.
	 *
	 * Match points are the primary key and board points the secondary, which is
	 * the reverse of the individual table — hence the column order ending
	 * "…, pp, mp" rather than "…, points, qp".
	 */
	import Table from '$lib/components/ui/Table/Table.svelte';
	import type {
		TableColumn,
		DensityThresholds,
		TableDensity
	} from '$lib/components/ui/Table/tableTypes';
	import { createTeamNameFormatter, isUnplaced, type TeamTournamentEndResultDto } from '$lib/api';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface TeamFinalResultsTableProps {
		results: TeamTournamentEndResultDto[];
		getClubName: (clubId: number) => string;
		loading?: boolean;
		error?: string;
		onRowClick?: (result: TeamTournamentEndResultDto) => void;
		density?: TableDensity;
		densityThresholds?: DensityThresholds;
	}

	let {
		results,
		getClubName,
		loading = false,
		error,
		onRowClick,
		density,
		densityThresholds
	}: TeamFinalResultsTableProps = $props();

	let labels = $derived(
		getTranslation(language.current).pages.tournamentResults.teamFinalResultsTable
	);

	// Built from the standings so a club fielding several teams gets Roman
	// numerals that match everywhere else in the group.
	let formatTeamName = $derived(createTeamNameFormatter(results, getClubName));

	let columns = $derived<TableColumn<TeamTournamentEndResultDto>[]>([
		{
			id: 'pos',
			header: labels.pos,
			// `place` is the NO_PLACE sentinel until the group produces standings.
			// Team rows carry no rating, so there is nothing to seed them by — a
			// dash is honest where a row number would imply a ranking.
			accessor: (row) => (isUnplaced(row) ? '-' : row.place),
			noWrap: true,
			sortValue: (row) => row.place
		},
		{
			id: 'team',
			header: labels.team,
			accessor: (row) => formatTeamName(row.contenderId, row.teamNumber),
			sortValue: (row) => formatTeamName(row.contenderId, row.teamNumber).toLowerCase()
		},
		{
			id: 'sp',
			header: labels.sp,
			accessor: (row) => (row.wonGames || 0) + (row.drawGames || 0) + (row.lostGames || 0) || '-',
			align: 'center',
			noWrap: true
		},
		{
			id: 'won',
			header: labels.won,
			accessor: (row) => row.wonGames ?? '-',
			align: 'center',
			noWrap: true
		},
		{
			id: 'draw',
			header: labels.draw,
			accessor: (row) => row.drawGames ?? '-',
			align: 'center',
			noWrap: true
		},
		{
			id: 'lost',
			header: labels.lost,
			accessor: (row) => row.lostGames ?? '-',
			align: 'center',
			noWrap: true
		},
		{
			id: 'pp',
			header: labels.pp,
			// Board points arrive with float noise and are only ever meaningful to
			// the half point.
			accessor: (row) =>
				row.secPoints !== undefined ? (Math.round(Number(row.secPoints) * 2) / 2).toFixed(1) : '-',
			align: 'center',
			noWrap: true,
			sortValue: (row) => Number(row.secPoints) || 0
		},
		{
			id: 'mp',
			header: labels.mp,
			accessor: (row) => (row.points !== undefined ? row.points.toFixed(2) : '-'),
			align: 'center',
			noWrap: true,
			// The Next app set `cellStyle: { fontWeight: 'medium' }` here, which is
			// not a valid CSS font-weight and never applied. Left unstyled so this
			// matches what the live site actually renders.
			sortValue: (row) => row.points ?? 0
		}
	]);
</script>

<Table
	data={results}
	{columns}
	{loading}
	{error}
	emptyMessage={labels.noResults}
	loadingMessage={labels.loadingResults}
	{onRowClick}
	getRowKey={(row) => `${row.contenderId}-${row.teamNumber}`}
	{density}
	{densityThresholds}
/>
