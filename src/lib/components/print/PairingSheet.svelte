<script lang="ts">
	/**
	 * The pairing sheet for one group and round: board, White and Black with
	 * their ratings, and a result column.
	 * Ports `components/print/PairingSheet.tsx`.
	 *
	 * The result stays blank for an unplayed game rather than showing a dash —
	 * this sheet is printed to be written on.
	 */
	import type { Snippet } from 'svelte';
	import PrintSheet from './PrintSheet.svelte';
	import {
		formatPlayerName,
		formatRatingWithType,
		getOpponentKind,
		getPlayerRatingByAlgorithm,
		type PlayerInfoDto,
		type TournamentRoundResultDto
	} from '$lib/api';
	import { formatIndividualRowResult, getResultLabels } from '$lib/results/formatResult';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface PairingSheetProps {
		round: number;
		pairings: TournamentRoundResultDto[];
		playerMap: Map<number, PlayerInfoDto>;
		rankingAlgorithm: number | null;
		fontPx: number;
		sheetHeader: Snippet;
		/** Group name appended to the title, empty when it would be redundant. */
		groupSuffix: string;
	}

	let {
		round,
		pairings,
		playerMap,
		rankingAlgorithm,
		fontPx,
		sheetHeader,
		groupSuffix
	}: PairingSheetProps = $props();

	let t = $derived(getTranslation(language.current));
	let print = $derived(t.pages.tournamentResults.print);
	let rb = $derived(t.pages.tournamentResults.roundByRound);

	let rows = $derived(
		pairings
			.filter((p) => (p.roundNr || 1) === round)
			.sort((a, b) => (a.board || 0) - (b.board || 0))
	);

	let title = $derived(
		groupSuffix ? `${rb.round} ${round} – ${groupSuffix}` : `${rb.round} ${round}`
	);

	function playerName(id: number): string {
		const kind = getOpponentKind(id);
		if (kind === 'walkover') return 'W.O';
		if (kind === 'bye') return t.pages.tournamentResults.bye;
		const player = playerMap.get(id);
		// An unresolved id prints as "White 408550", as the Next app had it. Same
		// stub family as the player page's `Player -100`, and msvens's call.
		return player
			? formatPlayerName(player.firstName, player.lastName, player.elo?.title)
			: `${rb.white} ${id}`;
	}

	function playerElo(id: number): string {
		const player = playerMap.get(id);
		if (!player) return '';
		const { rating, ratingType } = getPlayerRatingByAlgorithm(player.elo, rankingAlgorithm);
		return formatRatingWithType(rating, ratingType, language.current);
	}

	let resultOf = $derived((pairing: TournamentRoundResultDto) =>
		formatIndividualRowResult(pairing, { ...getResultLabels(t), noResult: '' })
	);
</script>

{#snippet columnHeader()}
	<tr class="border-b-2 border-black text-left">
		<th class="w-8 py-1 pr-2 text-right">{rb.table}</th>
		<th class="py-1 pr-2">{rb.white}</th>
		<th class="w-14 py-1 pr-2 text-right">{rb.elo}</th>
		<th class="py-1 pr-2">{rb.black}</th>
		<th class="w-14 py-1 pr-2 text-right">{rb.elo}</th>
		<th class="w-16 py-1 text-center">{rb.result}</th>
	</tr>
{/snippet}

{#snippet row(pairing: TournamentRoundResultDto)}
	<tr class="border-b border-gray-300">
		<td class="py-0.5 pr-2 text-right tabular-nums">{pairing.board || '-'}</td>
		<td class="py-0.5 pr-2">{playerName(pairing.homeId)}</td>
		<td class="py-0.5 pr-2 text-right tabular-nums">{playerElo(pairing.homeId)}</td>
		<td class="py-0.5 pr-2">{playerName(pairing.awayId)}</td>
		<td class="py-0.5 pr-2 text-right tabular-nums">{playerElo(pairing.awayId)}</td>
		<td class="py-0.5 text-center tabular-nums">{resultOf(pairing)}</td>
	</tr>
{/snippet}

<PrintSheet
	{sheetHeader}
	{title}
	{columnHeader}
	{rows}
	{row}
	emptyMessage={print.noPairings}
	{fontPx}
/>
