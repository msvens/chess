<script lang="ts">
	/**
	 * The print document: every target group yields a pairing sheet and then a
	 * standings sheet, each self-contained.
	 * Ports `components/print/PrintableTournament.tsx`.
	 *
	 * Always light, whatever the app's theme — this is paper.
	 */
	import PairingSheet from './PairingSheet.svelte';
	import StandingsSheet from './StandingsSheet.svelte';
	import TeamPairingSheet from './TeamPairingSheet.svelte';
	import TeamStandingsSheet from './TeamStandingsSheet.svelte';
	import ExternalResultsNotice from '$lib/components/results/ExternalResultsNotice.svelte';
	import { effectiveFontPx, type FontMode } from '$lib/print/printStyle';
	import type { PrintData, PrintGroupData } from '$lib/print/printData';
	import { groupMatchesByRound } from '$lib/results/teamMatches';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface PrintableTournamentProps {
		data: PrintData;
		round: number;
		fontMode: FontMode;
		auto: boolean;
	}

	let { data, round, fontMode, auto }: PrintableTournamentProps = $props();

	let t = $derived(getTranslation(language.current).pages.tournamentResults);

	const externalUrl = (groupId: number) =>
		`https://resultat.schack.se/ShowTournamentServlet?id=${groupId}`;

	/** Rows on the pairing sheet, which sets the font size for that sheet. */
	function pairingRowCount(group: PrintGroupData): number {
		if (group.kind === 'team')
			return (groupMatchesByRound(group.roundResults).get(round) ?? []).length;
		return group.roundResults.filter((r) => (r.roundNr || 1) === round).length;
	}

	function standingsRowCount(group: PrintGroupData): number {
		return group.kind === 'team' ? group.teamStandings.length : group.standings.length;
	}

	/** Sheets name the class only when the tournament has more than one. */
	const sheetTitle = (group: PrintGroupData) =>
		group.multipleClasses && group.className
			? `${data.tournament.name} – ${group.className}`
			: data.tournament.name;
</script>

<div class="print-document">
	{#each data.groups as group (group.group.id)}
		{@const groupSuffix = group.multipleGroups ? group.group.name : ''}

		{#snippet sheetHeader()}
			<header class="mb-3">
				<h1 class="text-lg font-bold">{sheetTitle(group)}</h1>
				<div class="text-xs text-gray-700">
					{data.tournament.start} – {data.tournament.end}{data.tournament.city
						? ` · ${data.tournament.city}`
						: ''}
				</div>
			</header>
		{/snippet}

		{#if group.kind === 'individuallyPairedTeam'}
			<!-- Schackfyran: the federation withholds these individual standings
			     because the players are children, so nothing was fetched and the
			     notice is the whole sheet. -->
			<div class="print-page text-black">
				{@render sheetHeader()}
				<ExternalResultsNotice
					prefix={t.externalNotice.individuallyPairedTeam.prefix}
					linkLabel={t.externalNotice.individuallyPairedTeam.linkLabel}
					suffix={t.externalNotice.individuallyPairedTeam.suffix}
					url={externalUrl(group.group.id)}
				/>
			</div>
		{:else if group.kind === 'team'}
			<TeamPairingSheet
				{round}
				boardRows={group.roundResults}
				teamStandings={group.teamStandings}
				fontPx={effectiveFontPx(fontMode, auto, pairingRowCount(group))}
				{sheetHeader}
				{groupSuffix}
			/>
			<TeamStandingsSheet
				standings={group.teamStandings}
				fontPx={effectiveFontPx(fontMode, auto, standingsRowCount(group))}
				{sheetHeader}
				{groupSuffix}
			/>
		{:else}
			<PairingSheet
				{round}
				pairings={group.roundResults}
				playerMap={group.playerMap}
				rankingAlgorithm={group.group.rankingAlgorithm}
				fontPx={effectiveFontPx(fontMode, auto, pairingRowCount(group))}
				{sheetHeader}
				{groupSuffix}
			/>
			<StandingsSheet
				standings={group.standings}
				rankingAlgorithm={group.group.rankingAlgorithm}
				fontPx={effectiveFontPx(fontMode, auto, standingsRowCount(group))}
				{sheetHeader}
				{groupSuffix}
			/>
		{/if}
	{/each}
</div>
