<script lang="ts">
	/**
	 * The standings sheet: rank, name, points and tiebreak.
	 * Ports `components/print/StandingsSheet.tsx`.
	 *
	 * Before a group produces standings every row carries the NO_PLACE sentinel,
	 * so sorting by `place` would print an arbitrarily ordered sheet of `1000`s.
	 * In that state this prints a start list instead: seeded by rating, numbered
	 * by seed position. A printed start list is the point of the sheet then.
	 */
	import type { Snippet } from 'svelte';
	import PrintSheet from './PrintSheet.svelte';
	import { formatPlayerName, hasStandings, type TournamentEndResultDto } from '$lib/api';
	import { seedOrder } from '$lib/results/seeding';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface StandingsSheetProps {
		standings: TournamentEndResultDto[];
		fontPx: number;
		sheetHeader: Snippet;
		groupSuffix: string;
		/** Picks the rating a start list is seeded by; unused once results exist. */
		rankingAlgorithm?: number | null;
	}

	let { standings, fontPx, sheetHeader, groupSuffix, rankingAlgorithm }: StandingsSheetProps =
		$props();

	let print = $derived(getTranslation(language.current).pages.tournamentResults.print);
	let placed = $derived(hasStandings(standings));
	let rows = $derived(
		placed
			? [...standings].sort((a, b) => a.place - b.place)
			: seedOrder(standings, rankingAlgorithm)
	);
	// Seed numbers come from the row's position, since no field carries them.
	let seedNumber = $derived(new Map(rows.map((row, i) => [row.contenderId, i + 1])));
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
		<td class="py-0.5 pr-2 text-right tabular-nums"
			>{placed ? entry.place : (seedNumber.get(entry.contenderId) ?? '-')}</td
		>
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
