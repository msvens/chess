<script lang="ts">
	/**
	 * Every match one team played in a group, each with its boards.
	 * Ports `components/results/TeamDetailMatches.tsx`.
	 *
	 * The sibling of `TeamRoundResults`, and deliberately built on the same
	 * `teamMatches.ts` core rather than a second copy of it — the React versions
	 * were ~90% duplicates, down to identical comments. Two differences remain:
	 * this one shows every match of every round at once instead of round tabs with
	 * one expandable row, and it orients each board so *this* team reads on the
	 * left, whichever side it actually played.
	 *
	 * A pure view: the page warms the rating cache, because it needs the same
	 * players for its own averages and two components racing for one cache key
	 * would fetch it twice.
	 */
	import Link from '$lib/components/ui/Link.svelte';
	import Table from '$lib/components/ui/Table/Table.svelte';
	import type { TableColumn } from '$lib/components/ui/Table/tableTypes';
	import { getOpponentKind, normalizeEloLookupDate, type TournamentRoundResultDto } from '$lib/api';
	import { formatBoardResult, getResultLabels } from '$lib/results/formatResult';
	import { formatMatchDate, parseDateToTimestamp } from '$lib/results/roundGrouping';
	import {
		boardGames,
		flipBoard,
		groupMatchesByRound,
		type BoardGame,
		type TeamMatch
	} from '$lib/results/teamMatches';
	import { localeOf } from '$lib/i18n';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface TeamDetailMatchesProps {
		/** This team's rows only. */
		matches: TournamentRoundResultDto[];
		selectedClubId: number;
		selectedTeamNumber: number;
		/** Built from the group's standings, so both sides of a match resolve. */
		formatTeamName: (contenderId: number, teamNumber: number) => string;
		getPlayerName: (playerId: number, date?: number) => string;
		getPlayerEloByDate: (playerId: number, date: number) => string;
		tournamentId: number;
		groupId: number;
	}

	let {
		matches,
		selectedClubId,
		selectedTeamNumber,
		formatTeamName,
		getPlayerName,
		getPlayerEloByDate,
		tournamentId,
		groupId
	}: TeamDetailMatchesProps = $props();

	let t = $derived(getTranslation(language.current));
	let tr = $derived(t.pages.tournamentResults);
	let resultLabels = $derived(getResultLabels(t));
	let locale = $derived(localeOf(language.current));

	/** Byes and walkovers occupy a team slot but have no team to name. */
	function teamLabel(id: number, teamNumber: number): string {
		switch (getOpponentKind(id)) {
			case 'bye':
				return tr.bye;
			case 'walkover':
				return tr.walkover;
			default:
				return formatTeamName(id, teamNumber);
		}
	}

	/** The month whose rating list applies; a future match falls back to the current one. */
	function lookupDateOf(match: TeamMatch): number {
		const raw = parseDateToTimestamp(match.date);
		return normalizeEloLookupDate(Number.isNaN(raw) || raw <= 0 ? Date.now() : raw);
	}

	/**
	 * A board plus the month its ratings are read at. Carried on the row rather
	 * than tracked alongside, because a `cell` snippet receives only its row and
	 * the player links need the match's own date.
	 */
	type CardBoard = BoardGame & { lookupDate: number };

	interface MatchCard {
		key: string;
		round: number;
		teamName: string;
		opponentName: string;
		/**
		 * Preserved verbatim from the Next app: raw numbers, no spaces, and no
		 * `formatScore`, so a half point prints `4.5` rather than `4½`. The group
		 * page renders the same score as `4.5 - 3.5`. msvens knows the two disagree
		 * and wants parity with the live site for now — do NOT "fix" this by
		 * calling `formatTeamMatchScore`.
		 */
		score: string;
		date: string;
		lookupDate: number;
		boards: CardBoard[];
	}

	let cards = $derived.by((): MatchCard[] => {
		const byRound = groupMatchesByRound(matches);
		return [...byRound.keys()]
			.sort((a, b) => a - b)
			.flatMap((round) =>
				(byRound.get(round) ?? []).map((match): MatchCard => {
					const atHome =
						match.homeId === selectedClubId && match.homeTeamNumber === selectedTeamNumber;
					const boards = boardGames(match);
					const ours = atHome ? match.homeResult : match.awayResult;
					const theirs = atHome ? match.awayResult : match.homeResult;
					const lookupDate = lookupDateOf(match);

					return {
						key: match.key,
						round,
						teamName: atHome
							? teamLabel(match.homeId, match.homeTeamNumber)
							: teamLabel(match.awayId, match.awayTeamNumber),
						opponentName: atHome
							? teamLabel(match.awayId, match.awayTeamNumber)
							: teamLabel(match.homeId, match.homeTeamNumber),
						score: ours === 0 && theirs === 0 ? '-' : `${ours}-${theirs}`,
						date: formatMatchDate(match.date, locale),
						lookupDate,
						// After the flip, `home*` is this team and `away*` the opponent,
						// so every BoardGame helper keeps working unchanged.
						boards: (atHome ? boards : boards.map(flipBoard)).map((board) => ({
							...board,
							lookupDate
						}))
					};
				})
			);
	});

	/**
	 * The board table is rebuilt per card because two of its headers are the team
	 * names, and those differ from match to match.
	 */
	function boardColumns(card: MatchCard): TableColumn<CardBoard>[] {
		return [
			{
				id: 'board',
				header: tr.teamRoundResults.board,
				accessor: (game) => game.boardNumber || '-',
				noWrap: true,
				width: '6%'
			},
			{
				id: 'selectedPlayer',
				header: card.teamName,
				headerClassName: 'max-w-[10ch] sm:max-w-none truncate',
				cell: ourPlayerCell,
				width: '28%'
			},
			{
				id: 'selectedElo',
				header: tr.teamRoundResults.elo,
				accessor: (game) => eloOf(game.homePlayerId, game.lookupDate),
				align: 'center',
				noWrap: true,
				width: '10%'
			},
			{
				id: 'opponentPlayer',
				header: card.opponentName,
				headerClassName: 'max-w-[10ch] sm:max-w-none truncate',
				cell: theirPlayerCell,
				width: '28%'
			},
			{
				id: 'opponentElo',
				header: tr.teamRoundResults.elo,
				accessor: (game) => eloOf(game.awayPlayerId, game.lookupDate),
				align: 'center',
				noWrap: true,
				width: '10%'
			},
			{
				id: 'result',
				header: tr.teamRoundResults.result,
				accessor: (game) => formatBoardResult(game, resultLabels),
				align: 'center',
				noWrap: true,
				width: '18%'
				// The Next app set `cellStyle: { fontWeight: 'medium' }` here, which is
				// not a valid CSS font-weight and never applied. Left unstyled so this
				// matches what the live site actually renders.
			}
		];
	}

	function eloOf(playerId: number, date: number): string {
		return getOpponentKind(playerId) === 'paired' ? getPlayerEloByDate(playerId, date) : '-';
	}
</script>

{#snippet playerName(playerId: number, date: number)}
	{#if getOpponentKind(playerId) === 'paired'}
		<Link href="/results/{tournamentId}/{groupId}/{playerId}" color="gray">
			{getPlayerName(playerId, date)}
		</Link>
	{:else}
		<span class="text-gray-500 dark:text-gray-400">
			{getOpponentKind(playerId) === 'bye' ? tr.bye : tr.walkover}
		</span>
	{/if}
{/snippet}

{#snippet ourPlayerCell(game: CardBoard)}
	{@render playerName(game.homePlayerId, game.lookupDate)}
{/snippet}

{#snippet theirPlayerCell(game: CardBoard)}
	{@render playerName(game.awayPlayerId, game.lookupDate)}
{/snippet}

{#if cards.length === 0}
	<div class="p-6 text-center">
		<div class="text-gray-600 dark:text-gray-400">{tr.teamDetailPage.noMatches}</div>
	</div>
{:else}
	<div class="space-y-6">
		{#each cards as card (card.key)}
			<div
				class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-dark-bg"
			>
				<div class="border-b border-gray-200 px-4 py-2 dark:border-gray-700">
					<div class="text-sm text-gray-700 dark:text-gray-300">
						<span class="font-medium">
							{tr.roundByRound.round}
							{card.round}: {card.score}
						</span>
						{#if card.date}
							<span class="text-gray-500 dark:text-gray-400"> · {card.date}</span>
						{/if}
					</div>
				</div>

				<div class="px-4 py-2">
					<Table
						data={card.boards}
						columns={boardColumns(card)}
						getRowKey={(game) => game.boardNumber}
						emptyMessage={tr.roundByRound.noResults}
						loadingMessage={tr.loading}
						density="compact"
					/>
				</div>
			</div>
		{/each}
	</div>
{/if}
