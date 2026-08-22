<script lang="ts">
	/**
	 * A rating list: players ranked by the selected rating type.
	 * Ports `components/RatingTable.tsx`.
	 *
	 * Used by the federation, district and club rating pages, which differ only in
	 * which service call fills `players`.
	 */
	import { goto } from '$app/navigation';
	import Table from '$lib/components/ui/Table/Table.svelte';
	import type { TableColumn } from '$lib/components/ui/Table/tableTypes';
	import { RatingType, type PlayerInfoDto } from '$lib/api';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface RatingTableProps {
		players: PlayerInfoDto[];
		ratingType: RatingType;
		loading: boolean;
	}

	let { players, ratingType, loading }: RatingTableProps = $props();

	let t = $derived(getTranslation(language.current));
	let labels = $derived(t.pages.organizations.ratingList);

	interface RankedPlayer extends PlayerInfoDto {
		rank: number;
	}

	function ratingOf(player: PlayerInfoDto): number {
		switch (ratingType) {
			case RatingType.STANDARD:
				return player.elo?.rating || 0;
			case RatingType.RAPID:
				return player.elo?.rapidRating || 0;
			case RatingType.BLITZ:
				return player.elo?.blitzRating || 0;
			default:
				return 0;
		}
	}

	// The API returns the list unordered for our purposes, so rank is assigned here
	// rather than trusted from upstream.
	let ranked = $derived<RankedPlayer[]>(
		[...players]
			.sort((a, b) => ratingOf(b) - ratingOf(a))
			.map((player, i) => ({ ...player, rank: i + 1 }))
	);

	let columns = $derived<TableColumn<RankedPlayer>[]>([
		{ id: 'rank', header: labels.tableHeaders.rank, accessor: 'rank', noWrap: true },
		{
			id: 'title',
			header: labels.tableHeaders.title,
			accessor: (p) => p.elo?.title || '',
			noWrap: true
		},
		{ id: 'firstName', header: labels.tableHeaders.firstName, accessor: 'firstName' },
		{ id: 'lastName', header: labels.tableHeaders.lastName, accessor: 'lastName' },
		{
			id: 'rating',
			header: labels.tableHeaders.rating,
			// 0 means unrated at this date, which reads better as a dash.
			accessor: (p) => ratingOf(p) || '-',
			noWrap: true
		}
	]);
</script>

<Table
	data={ranked}
	{columns}
	{loading}
	emptyMessage={labels.noPlayers}
	loadingMessage={labels.loading}
	onRowClick={(player) => player.id && goto(`/players/${player.id}`)}
	getRowKey={(player, index) => player.id ?? index}
	pagination={{
		pageSize: 50,
		labels: {
			showing: t.pages.organizations.pagination.showing,
			of: t.pages.organizations.pagination.of,
			itemName: t.pages.organizations.pagination.players
		}
	}}
/>
