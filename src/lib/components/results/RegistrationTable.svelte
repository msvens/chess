<script lang="ts">
	/**
	 * The entry list, for a tournament that has not started.
	 * Ports `components/results/RegistrationTable.tsx`.
	 *
	 * No scores yet, so the columns are who has entered and their rating; the
	 * position column is the seed number, not a standing.
	 *
	 * The API hands the rows over in arbitrary order, so they are seeded here —
	 * by the same rating the Rating column shows, which is the order the official
	 * start list is in. See `$lib/results/seeding`.
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
		type TournamentEndResultDto
	} from '$lib/api';
	import { seedOrder } from '$lib/results/seeding';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface RegistrationTableProps {
		results: TournamentEndResultDto[];
		rankingAlgorithm?: number | null;
		loading?: boolean;
		error?: string;
		onRowClick?: (result: TournamentEndResultDto) => void;
		density?: TableDensity;
		densityThresholds?: DensityThresholds;
	}

	let {
		results,
		rankingAlgorithm,
		loading = false,
		error,
		onRowClick,
		density,
		densityThresholds
	}: RegistrationTableProps = $props();

	let t = $derived(getTranslation(language.current).pages.tournamentResults);
	let labels = $derived(t.registrationTable);

	const idOf = (row: TournamentEndResultDto) => row.playerInfo?.id ?? row.contenderId;

	let seeded = $derived(seedOrder(results, rankingAlgorithm));

	// The seed number is the row's position in the seeded order — there is no
	// field for it — so it is read from the index rather than added to the row,
	// which also keeps `onRowClick` handing back the untouched DTO.
	let order = $derived(new Map(seeded.map((row, i) => [idOf(row), i + 1])));

	let columns = $derived<TableColumn<TournamentEndResultDto>[]>([
		{
			id: 'pos',
			header: labels.pos,
			accessor: (row) => order.get(idOf(row)) ?? '-',
			noWrap: true
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
					: t.unknownPlayer
		},
		{
			id: 'club',
			header: labels.club,
			accessor: (row) => row.playerInfo?.club || '-',
			cellClassName:
				'max-w-[9ch] sm:max-w-none overflow-hidden whitespace-nowrap sm:whitespace-normal'
		},
		{
			id: 'rating',
			header: labels.rating,
			accessor: (row) => {
				const { rating, ratingType } = getPlayerRatingByAlgorithm(
					row.playerInfo?.elo,
					rankingAlgorithm
				);
				return formatRatingWithType(rating, ratingType, language.current);
			},
			noWrap: true
		}
	]);
</script>

<Table
	data={seeded}
	{columns}
	{loading}
	{error}
	emptyMessage={labels.noRegistrations}
	loadingMessage={labels.loadingRegistrations}
	{onRowClick}
	getRowKey={(row, index) => idOf(row) ?? index}
	{density}
	{densityThresholds}
/>
