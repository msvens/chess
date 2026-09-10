<script lang="ts">
	/**
	 * The team standings sheet: rank, team, match points and board points.
	 * Ports `components/print/TeamStandingsSheet.tsx`.
	 */
	import type { Snippet } from 'svelte';
	import PrintSheet from './PrintSheet.svelte';
	import { createTeamNameFormatter, type TeamTournamentEndResultDto } from '$lib/api';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface TeamStandingsSheetProps {
		standings: TeamTournamentEndResultDto[];
		fontPx: number;
		sheetHeader: Snippet;
		groupSuffix: string;
	}

	let { standings, fontPx, sheetHeader, groupSuffix }: TeamStandingsSheetProps = $props();

	const organizations = getOrganizationsState();

	let print = $derived(getTranslation(language.current).pages.tournamentResults.print);

	let teamName = $derived(
		createTeamNameFormatter(standings, (orgNumber: number) => organizations.getClubName(orgNumber))
	);

	let rows = $derived([...standings].sort((a, b) => a.place - b.place));
	let title = $derived(groupSuffix ? `${print.standings} – ${groupSuffix}` : print.standings);
</script>

{#snippet columnHeader()}
	<tr class="border-b-2 border-black text-left">
		<th class="w-8 py-1 pr-2 text-right">{print.rank}</th>
		<th class="py-1 pr-2">{print.team}</th>
		<th class="w-16 py-1 pr-2 text-right">{print.matchPoints}</th>
		<th class="w-16 py-1 text-right">{print.boardPoints}</th>
	</tr>
{/snippet}

{#snippet row(entry: TeamTournamentEndResultDto)}
	<tr class="border-b border-gray-300">
		<td class="py-0.5 pr-2 text-right tabular-nums">{entry.place}</td>
		<td class="py-0.5 pr-2">{teamName(entry.contenderId, entry.teamNumber)}</td>
		<td class="py-0.5 pr-2 text-right font-semibold tabular-nums">{entry.points}</td>
		<td class="py-0.5 text-right tabular-nums">{entry.secPoints?.toFixed(1)}</td>
	</tr>
{/snippet}

<PrintSheet
	{sheetHeader}
	{title}
	{columnHeader}
	{rows}
	{row}
	emptyMessage={print.noStandings}
	{fontPx}
/>
