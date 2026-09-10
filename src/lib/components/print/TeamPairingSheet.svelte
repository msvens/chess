<script lang="ts">
	/**
	 * The team pairing sheet: a round's matches, home against away, with the score.
	 * Ports `components/print/TeamPairingSheet.tsx`.
	 *
	 * The grouping comes from `groupMatchesByRound`, which the results page
	 * already uses — React re-implemented it here, accumulating into the same
	 * match key. The score string is still built by hand rather than through
	 * `formatTeamMatchScore`: the shared formatter writes `4 - 3` with a hyphen
	 * and halves as ½, while this sheet has always printed `4 – 3` with an en
	 * dash and a plain 4.5. Changing that changes a printed value, so it is
	 * msvens's call, not a porting decision.
	 */
	import type { Snippet } from 'svelte';
	import PrintSheet from './PrintSheet.svelte';
	import {
		createTeamNameFormatter,
		type TeamTournamentEndResultDto,
		type TournamentRoundResultDto
	} from '$lib/api';
	import { groupMatchesByRound, type TeamMatch } from '$lib/results/teamMatches';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface TeamPairingSheetProps {
		round: number;
		boardRows: TournamentRoundResultDto[];
		teamStandings: TeamTournamentEndResultDto[];
		fontPx: number;
		sheetHeader: Snippet;
		groupSuffix: string;
	}

	let { round, boardRows, teamStandings, fontPx, sheetHeader, groupSuffix }: TeamPairingSheetProps =
		$props();

	const organizations = getOrganizationsState();

	let t = $derived(getTranslation(language.current));
	let print = $derived(t.pages.tournamentResults.print);
	let rb = $derived(t.pages.tournamentResults.roundByRound);

	let teamName = $derived(
		createTeamNameFormatter(teamStandings, (orgNumber: number) =>
			organizations.getClubName(orgNumber)
		)
	);

	let rows = $derived(groupMatchesByRound(boardRows).get(round) ?? []);
	let title = $derived(
		groupSuffix ? `${rb.round} ${round} – ${groupSuffix}` : `${rb.round} ${round}`
	);

	/** Nil-all means the match has not been played, so the cell stays blank. */
	const score = (match: TeamMatch) =>
		match.homeResult === 0 && match.awayResult === 0
			? ''
			: `${match.homeResult} – ${match.awayResult}`;
</script>

{#snippet columnHeader()}
	<tr class="border-b-2 border-black text-left">
		<th class="w-8 py-1 pr-2 text-right">{rb.table}</th>
		<th class="py-1 pr-2">{print.home}</th>
		<th class="py-1 pr-2">{print.away}</th>
		<th class="w-16 py-1 text-center">{rb.result}</th>
	</tr>
{/snippet}

{#snippet row(match: TeamMatch, index: number)}
	<tr class="border-b border-gray-300">
		<td class="py-0.5 pr-2 text-right tabular-nums">{index + 1}</td>
		<td class="py-0.5 pr-2">{teamName(match.homeId, match.homeTeamNumber)}</td>
		<td class="py-0.5 pr-2">{teamName(match.awayId, match.awayTeamNumber)}</td>
		<td class="py-0.5 text-center tabular-nums">{score(match)}</td>
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
