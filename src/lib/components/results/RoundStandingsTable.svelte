<script lang="ts">
	/**
	 * Standings as they stood after a given round.
	 * Ports `components/results/RoundStandingsTable.tsx`.
	 *
	 * Mirrors FinalResultsTable's columns but reads round snapshots: `points` are
	 * exact, while `qualityPoints` are the SDK's indicative tie-break estimate —
	 * hence the `≈` on that header and the caveat the page renders.
	 */
	import Table from '$lib/components/ui/Table.svelte';
	import type { TableColumn, DensityThresholds, TableDensity } from '$lib/components/ui/tableTypes';
	import {
		formatPlayerName,
		formatRatingWithType,
		getPlayerRatingByAlgorithm,
		type PlayerInfoDto,
		type RoundStandingRow
	} from '$lib/api';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface RoundStandingsTableProps {
		/** Rows for one round, already sorted best-first by the SDK. */
		rows: RoundStandingRow[];
		/** Built from the official standings' embedded player info. */
		playerMap: Map<number, PlayerInfoDto>;
		rankingAlgorithm?: number | null;
		onRowClick?: (row: RoundStandingRow) => void;
		density?: TableDensity;
		densityThresholds?: DensityThresholds;
		/**
		 * Contender id -> rank within the shown subset, rendered "1 (6)". Snapshot
		 * ranks legitimately tie, so the supplied map uses standard competition
		 * ranking.
		 */
		subsetRank?: ReadonlyMap<number, number>;
	}

	let {
		rows,
		playerMap,
		rankingAlgorithm,
		onRowClick,
		density,
		densityThresholds,
		subsetRank
	}: RoundStandingsTableProps = $props();

	let t = $derived(getTranslation(language.current).pages.tournamentResults);
	let labels = $derived(t.finalResultsTable);

	const playerOf = (row: RoundStandingRow) => playerMap.get(row.contenderId);
	const ratingOf = (row: RoundStandingRow) =>
		getPlayerRatingByAlgorithm(playerOf(row)?.elo, rankingAlgorithm);

	let columns = $derived<TableColumn<RoundStandingRow>[]>([
		{
			id: 'pos',
			header: labels.pos,
			accessor: (row) => {
				const rank = subsetRank?.get(row.contenderId);
				return rank == null ? row.rank : `${rank} (${row.rank})`;
			},
			noWrap: true,
			sortValue: (row) => subsetRank?.get(row.contenderId) ?? row.rank
		},
		{
			id: 'name',
			header: labels.name,
			accessor: (row) => {
				const player = playerOf(row);
				return player
					? formatPlayerName(player.firstName, player.lastName, player.elo?.title)
					: t.unknownPlayer;
			},
			sortValue: (row) => {
				const player = playerOf(row);
				return player ? `${player.lastName} ${player.firstName}`.toLowerCase() : '';
			}
		},
		{
			id: 'club',
			header: labels.club,
			accessor: (row) => playerOf(row)?.club || '-',
			cellClassName:
				'max-w-[9ch] sm:max-w-none overflow-hidden whitespace-nowrap sm:whitespace-normal',
			sortValue: (row) => (playerOf(row)?.club || '').toLowerCase()
		},
		{
			id: 'ranking',
			header: labels.ranking,
			accessor: (row) => {
				const { rating, ratingType } = ratingOf(row);
				return formatRatingWithType(rating, ratingType, language.current);
			},
			noWrap: true,
			sortValue: (row) => ratingOf(row).rating ?? 0
		},
		{
			id: 'gp',
			header: labels.gp,
			accessor: (row) => row.gamesPlayed || '-',
			align: 'center',
			noWrap: true,
			headerClassName: 'hidden sm:table-cell',
			cellClassName: 'hidden sm:table-cell'
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
			id: 'points',
			header: labels.points,
			accessor: (row) => row.points,
			align: 'center',
			noWrap: true,
			// The Next app set `cellStyle: { fontWeight: 'medium' }` here, which is
			// not a valid CSS font-weight and never applied. Left unstyled so this
			// matches what the live site actually renders.
			sortValue: (row) => row.points
		},
		{
			id: 'qp',
			header: labels.qp,
			accessor: (row) => (row.qualityPoints != null ? Number(row.qualityPoints).toFixed(1) : '-'),
			align: 'center',
			noWrap: true,
			sortValue: (row) => row.qualityPoints ?? 0
		}
	]);
</script>

<Table
	data={rows}
	{columns}
	emptyMessage={labels.noResults}
	loadingMessage={labels.loadingResults}
	{onRowClick}
	getRowKey={(row, index) => row.contenderId ?? index}
	{density}
	{densityThresholds}
/>
