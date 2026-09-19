<script lang="ts">
	/**
	 * Final standings for an individual tournament.
	 * Ports `components/results/FinalResultsTable.tsx`.
	 */
	import Table from '$lib/components/ui/Table/Table.svelte';
	import type {
		TableColumn,
		DensityThresholds,
		TableDensity
	} from '$lib/components/ui/Table/tableTypes';
	import {
		formatPlayerName,
		formatRatingWithType,
		getPlayerRatingByAlgorithm,
		isUnplaced,
		type TournamentEndResultDto
	} from '$lib/api';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface FinalResultsTableProps {
		results: TournamentEndResultDto[];
		rankingAlgorithm?: number | null;
		loading?: boolean;
		error?: string;
		onRowClick?: (result: TournamentEndResultDto) => void;
		density?: TableDensity;
		densityThresholds?: DensityThresholds;
		/**
		 * Contender id -> 1-based rank within the currently-shown subset. When the
		 * results have been filtered (e.g. to women only), the placement column
		 * shows that rank with the official overall place in parentheses — "1 (6)" —
		 * so a prize list reads top-down while the true standing stays visible. A
		 * map rather than a row index because the table re-sorts internally.
		 */
		subsetRank?: ReadonlyMap<number, number>;
	}

	let {
		results,
		rankingAlgorithm,
		loading = false,
		error,
		onRowClick,
		density,
		densityThresholds,
		subsetRank
	}: FinalResultsTableProps = $props();

	let t = $derived(getTranslation(language.current).pages.tournamentResults);
	let labels = $derived(t.finalResultsTable);

	const idOf = (row: TournamentEndResultDto) => row.playerInfo?.id ?? row.contenderId;
	const rankOf = (row: TournamentEndResultDto) => subsetRank?.get(idOf(row));

	let columns = $derived<TableColumn<TournamentEndResultDto>[]>([
		{
			id: 'pos',
			header: labels.pos,
			accessor: (row) => {
				// An unplaced row means the group has no standings; the page routes
				// those to the seeded start list instead, so this is a backstop that
				// keeps the NO_PLACE sentinel from ever reaching the screen.
				const place = isUnplaced(row) ? '-' : row.place;
				const rank = rankOf(row);
				return rank == null ? place : `${rank} (${place})`;
			},
			noWrap: true,
			sortValue: (row) => rankOf(row) ?? row.place
		},
		{
			id: 'name',
			header: labels.name,
			accessor: (row) =>
				row.playerInfo
					? formatPlayerName(
							row.playerInfo.firstName,
							row.playerInfo.lastName,
							row.playerInfo.elo?.title
						)
					: t.unknownPlayer,
			sortValue: (row) =>
				row.playerInfo ? `${row.playerInfo.lastName} ${row.playerInfo.firstName}`.toLowerCase() : ''
		},
		{
			id: 'club',
			header: labels.club,
			accessor: (row) => row.playerInfo?.club || '-',
			// Club names are long and the least important column on a phone; clip
			// rather than let them push the score columns off-screen.
			cellClassName:
				'max-w-[9ch] sm:max-w-none overflow-hidden whitespace-nowrap sm:whitespace-normal',
			sortValue: (row) => (row.playerInfo?.club || '').toLowerCase()
		},
		{
			id: 'ranking',
			header: labels.ranking,
			accessor: (row) => {
				const { rating, ratingType } = getPlayerRatingByAlgorithm(
					row.playerInfo?.elo,
					rankingAlgorithm
				);
				return formatRatingWithType(rating, ratingType, language.current);
			},
			noWrap: true,
			sortValue: (row) =>
				getPlayerRatingByAlgorithm(row.playerInfo?.elo, rankingAlgorithm).rating ?? 0
		},
		{
			id: 'gp',
			header: labels.gp,
			accessor: (row) => (row.wonGames || 0) + (row.drawGames || 0) + (row.lostGames || 0) || '-',
			align: 'center',
			noWrap: true,
			// Games played is derivable from won/draw/lost, so it is the first to go.
			headerClassName: 'hidden sm:table-cell',
			cellClassName: 'hidden sm:table-cell'
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
			id: 'points',
			header: labels.points,
			accessor: (row) => row.points ?? '-',
			align: 'center',
			noWrap: true,
			// The Next app set `cellStyle: { fontWeight: 'medium' }` here, which is
			// not a valid CSS font-weight and never applied. Left unstyled so this
			// matches what the live site actually renders.
			sortValue: (row) => row.points ?? 0
		},
		{
			id: 'qp',
			header: labels.qp,
			// Tie-break points come back with float noise; they are only ever
			// meaningful to the half point.
			accessor: (row) =>
				row.secPoints !== undefined ? (Math.round(Number(row.secPoints) * 2) / 2).toFixed(1) : '-',
			align: 'center',
			noWrap: true,
			sortValue: (row) => Number(row.secPoints) || 0
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
	getRowKey={(row, index) => idOf(row) ?? index}
	{density}
	{densityThresholds}
/>
