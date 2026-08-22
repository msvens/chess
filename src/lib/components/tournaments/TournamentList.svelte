<script lang="ts">
	/**
	 * Tournaments as a sortable table. Ports `components/TournamentList.tsx`.
	 *
	 * Two columns need markup — the name is a link, and "last updated" hides its
	 * time below `lg` — so they use `cell` snippets. The rest are plain accessors.
	 */
	import Table from '$lib/components/ui/Table/Table.svelte';
	import Link from '$lib/components/ui/Link.svelte';
	import type { TableColumn } from '$lib/components/ui/Table/tableTypes';
	import type { TournamentDto } from '$lib/api';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import { toTournamentRows, type TournamentRow } from './tournamentRows';

	interface TournamentListProps {
		tournaments: TournamentDto[];
		loading?: boolean;
		error?: string;
		showUpdatedColumn?: boolean;
		/** Overrides the default loading text — wide date ranges are slow enough to warrant saying so. */
		loadingMessage?: string;
	}

	let {
		tournaments,
		loading = false,
		error,
		showUpdatedColumn = false,
		loadingMessage
	}: TournamentListProps = $props();

	const organizations = getOrganizationsState();

	let t = $derived(getTranslation(language.current));
	let labels = $derived(t.pages.calendar.tournamentList);
	let rows = $derived(
		toTournamentRows(tournaments, (type, number) => organizations.getOrganizerName(type, number))
	);

	let columns = $derived<TableColumn<TournamentRow>[]>([
		{
			id: 'name',
			header: labels.tournament,
			cell: nameCell,
			sortValue: (row) => row.name.toLowerCase()
		},
		{
			id: 'club',
			header: labels.organizer,
			accessor: 'club',
			sortValue: (row) => row.club.toLowerCase()
		},
		{ id: 'start', header: labels.start, accessor: 'start', sortValue: (row) => row.start },
		{ id: 'end', header: labels.end, accessor: 'end', sortValue: (row) => row.end },
		...(showUpdatedColumn
			? [
					{
						id: 'lastUpdated',
						header: labels.lastUpdated,
						cell: updatedCell,
						sortValue: (row: TournamentRow) => `${row.lastUpdatedDate} ${row.lastUpdatedTime}`,
						// The whole column goes below md — it is the least important one.
						headerClassName: 'hidden md:table-cell',
						cellClassName: 'hidden md:table-cell'
					}
				]
			: [])
	]);
</script>

{#snippet nameCell(row: TournamentRow)}
	<Link href={`/results/${row.tournamentId}`}>{row.name}</Link>
{/snippet}

{#snippet updatedCell(row: TournamentRow)}
	<!-- Date only on md-lg, date and time from lg up. -->
	<span class="lg:hidden">{row.lastUpdatedDate}</span>
	<span class="hidden lg:inline">{row.lastUpdatedDate} {row.lastUpdatedTime}</span>
{/snippet}

{#if loading}
	<div class="py-8 text-center text-gray-500 dark:text-gray-400">
		{loadingMessage ?? labels.loading}
	</div>
{:else if error}
	<div class="py-8 text-center text-red-600 dark:text-red-400">{error}</div>
{:else if tournaments.length === 0}
	<div class="py-8 text-center text-gray-500 dark:text-gray-400">{labels.noTournaments}</div>
{:else}
	<!-- The branches above already cover loading and empty, so Table's own
	     messages never render here; it still asks for them, and passing the same
	     labels keeps the two paths from drifting apart. -->
	<Table
		data={rows}
		{columns}
		border={false}
		emptyMessage={labels.noTournaments}
		loadingMessage={loadingMessage ?? labels.loading}
	/>
{/if}
