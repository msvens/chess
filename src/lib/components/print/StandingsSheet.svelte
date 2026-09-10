<script lang="ts">
	/**
	 * The standings sheet: rank, name, points and tiebreak.
	 * Ports `components/print/StandingsSheet.tsx`.
	 */
	import type { Snippet } from 'svelte';
	import PrintSheet from './PrintSheet.svelte';
	import { formatPlayerName, type TournamentEndResultDto } from '$lib/api';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface StandingsSheetProps {
		standings: TournamentEndResultDto[];
		fontPx: number;
		sheetHeader: Snippet;
		groupSuffix: string;
	}

	let { standings, fontPx, sheetHeader, groupSuffix }: StandingsSheetProps = $props();

	let print = $derived(getTranslation(language.current).pages.tournamentResults.print);
	let rows = $derived([...standings].sort((a, b) => a.place - b.place));
	let title = $derived(groupSuffix ? `${print.standings} – ${groupSuffix}` : print.standings);

	const nameOf = (row: TournamentEndResultDto, fallback: string) =>
		row.playerInfo
			? formatPlayerName(
					row.playerInfo.firstName,
					row.playerInfo.lastName,
					row.playerInfo.elo?.title
				)
			: `${fallback} ${row.contenderId}`;
</script>

{#snippet columnHeader()}
	<tr class="border-b-2 border-black text-left">
		<th class="w-8 py-1 pr-2 text-right">{print.rank}</th>
		<th class="py-1 pr-2">{print.name}</th>
		<th class="w-16 py-1 pr-2 text-right">{print.points}</th>
		<th class="w-16 py-1 text-right">{print.tiebreak}</th>
	</tr>
{/snippet}

{#snippet row(entry: TournamentEndResultDto)}
	<tr class="border-b border-gray-300">
		<td class="py-0.5 pr-2 text-right tabular-nums">{entry.place}</td>
		<td class="py-0.5 pr-2">{nameOf(entry, print.name)}</td>
		<td class="py-0.5 pr-2 text-right font-semibold tabular-nums">{entry.points}</td>
		<td class="py-0.5 text-right tabular-nums">{entry.secPoints.toFixed(1)}</td>
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
