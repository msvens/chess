<script lang="ts">
	/**
	 * One team's matches within a group.
	 * Ports `results/[tournamentId]/[groupId]/team/[teamId]/page.tsx`.
	 *
	 * A child of the `[groupId]` layout, so the whole group — tournament, team
	 * standings, round results, the player cache and every lookup — arrives
	 * through context. The React version fetched the tournament again, purely to
	 * render the breadcrumb, and ran a second loading/error state machine around
	 * it; none of that is here.
	 */
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import Link from '$lib/components/ui/Link.svelte';
	import TeamDetailMatches from '$lib/components/results/TeamDetailMatches.svelte';
	import { createTeamNameFormatter, getOpponentKind, normalizeEloLookupDate } from '$lib/api';
	import { parseDateToTimestamp } from '$lib/results/roundGrouping';
	import { boardGames, groupMatchesByRound } from '$lib/results/teamMatches';
	import { parseTeamId } from '$lib/results/teamId';
	import { getGroupResultsState } from '$lib/stores/groupResults.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	const results = getGroupResultsState();

	let t = $derived(getTranslation(language.current));
	let tr = $derived(t.pages.tournamentResults);
	let labels = $derived(tr.teamDetailPage);

	let tournamentId = $derived(Number.parseInt(page.params.tournamentId ?? '', 10));
	let groupId = $derived(Number.parseInt(page.params.groupId ?? '', 10));
	let team = $derived(parseTeamId(page.params.teamId));

	let standingsUrl = $derived(`/results/${tournamentId}/${groupId}`);

	/** The team's row in the official standings — the source of place and W-D-L. */
	let teamInfo = $derived(
		team
			? (results.teamResults.find(
					(row) => row.contenderId === team.clubId && row.teamNumber === team.teamNumber
				) ?? null)
			: null
	);

	let teamName = $derived.by(() => {
		if (!team) return '';
		const format = createTeamNameFormatter(results.teamResults, (clubId) =>
			results.getClubName(clubId)
		);
		return format(team.clubId, team.teamNumber);
	});

	/** This team's rows, from either side of the pairing. */
	let teamMatches = $derived(
		team
			? results.teamRoundResults.filter(
					(row) =>
						(row.homeId === team.clubId && row.homeTeamNumber === team.teamNumber) ||
						(row.awayId === team.clubId && row.awayTeamNumber === team.teamNumber)
				)
			: []
	);

	/**
	 * Every (player, month) pair the boards of this team's matches will show.
	 *
	 * Warmed from the page rather than from `TeamDetailMatches`, because the
	 * averages below need exactly the same records; two components asking for one
	 * cache key at the same moment would fetch it twice, since the entry only
	 * exists once the first response lands.
	 */
	let playerLookups = $derived.by(() => {
		const lookups: { playerId: number; date: number }[] = [];
		for (const [, matches] of groupMatchesByRound(teamMatches)) {
			for (const match of matches) {
				const raw = parseDateToTimestamp(match.date);
				const date = normalizeEloLookupDate(Number.isNaN(raw) || raw <= 0 ? Date.now() : raw);
				for (const board of boardGames(match)) {
					if (getOpponentKind(board.homePlayerId) === 'paired') {
						lookups.push({ playerId: board.homePlayerId, date });
					}
					if (getOpponentKind(board.awayPlayerId) === 'paired') {
						lookups.push({ playerId: board.awayPlayerId, date });
					}
				}
			}
		}
		return lookups;
	});

	/**
	 * Mean rating of the players each side fielded.
	 *
	 * A `$derived`, not an effect with a "player data loaded" counter: the cache
	 * is a `SvelteMap`, so reading it here is reactive and these recompute on
	 * their own as records land. The React version needed the counter because a
	 * ref mutation is invisible to it.
	 *
	 * Ratings come from `getPlayerRatingByDate` — the React version reached the
	 * number by `parseInt`-ing the formatted string ("1638 S" → 1638).
	 */
	let averageRatings = $derived.by(() => {
		const ours: number[] = [];
		const theirs: number[] = [];
		if (!team) return { team: null, opponent: null };

		for (const [, matches] of groupMatchesByRound(teamMatches)) {
			for (const match of matches) {
				const atHome = match.homeId === team.clubId && match.homeTeamNumber === team.teamNumber;
				const raw = parseDateToTimestamp(match.date);
				const date = normalizeEloLookupDate(Number.isNaN(raw) || raw <= 0 ? Date.now() : raw);

				for (const board of boardGames(match)) {
					const ourId = atHome ? board.homePlayerId : board.awayPlayerId;
					const theirId = atHome ? board.awayPlayerId : board.homePlayerId;
					const ourRating = ratingOf(ourId, date);
					const theirRating = ratingOf(theirId, date);
					if (ourRating !== null) ours.push(ourRating);
					if (theirRating !== null) theirs.push(theirRating);
				}
			}
		}

		return { team: mean(ours), opponent: mean(theirs) };
	});

	function ratingOf(playerId: number, date: number): number | null {
		if (getOpponentKind(playerId) !== 'paired') return null;
		return results.getPlayerRatingByDate(playerId, date);
	}

	function mean(values: number[]): number | null {
		if (values.length === 0) return null;
		return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
	}

	// Warm the cache for the boards on screen. Depends only on the derived request
	// list — never on the cache itself, which is what made the React version
	// re-fetch after every write.
	$effect(() => {
		const requests = playerLookups;
		if (requests.length === 0) return;
		untrack(() => {
			results.fetchPlayersByDate(requests).catch(() => {
				// A miss degrades a rating cell to "-"; it must not gate the page,
				// which is what the React version's uncaught rejection did.
			});
		});
	});
</script>

<PageLayout fullScreen maxWidth="5xl">
	{#if results.error}
		<div class="text-center">
			<div
				class="rounded-lg border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-dark-bg"
			>
				<h1 class="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-200">{tr.error}</h1>
				<p class="mb-6 text-lg text-gray-600 dark:text-gray-400">{results.error}</p>
				<Link href={standingsUrl}>{labels.backToStandings}</Link>
			</div>
		</div>
	{:else if !team || (!results.loading && !teamInfo)}
		<div class="text-center">
			<div
				class="rounded-lg border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-dark-bg"
			>
				<h1 class="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-200">
					{tr.notFound}
				</h1>
				<p class="mb-6 text-lg text-gray-600 dark:text-gray-400">
					{team ? labels.teamNotFound : labels.invalidTeamId}
				</p>
				<Link href={standingsUrl}>{labels.backToStandings}</Link>
			</div>
		</div>
	{:else if teamInfo}
		<div class="mb-4">
			<div class="mb-1 text-sm text-gray-500 dark:text-gray-400">
				<Link href={standingsUrl} color="inherit" underline="hover">
					{results.tournament?.name ?? ''}
				</Link>
			</div>
			<h1 class="text-xl font-light text-gray-900 md:text-2xl dark:text-gray-200">
				{tr.ongoingResults}
				{teamName}
			</h1>
			<div class="mt-2 space-y-0.5 text-sm text-gray-600 dark:text-gray-400">
				<div>
					<span class="font-medium text-gray-700 dark:text-gray-300">{labels.position}:</span>
					#{teamInfo.place}
				</div>
				<div>
					<span class="font-medium text-gray-700 dark:text-gray-300">{labels.winDrawLoss}:</span>
					{teamInfo.wonGames ?? 0}-{teamInfo.drawGames ?? 0}-{teamInfo.lostGames ?? 0}
				</div>
				<div>
					<span class="font-medium text-gray-700 dark:text-gray-300">{labels.teamAvgRating}:</span>
					{averageRatings.team ?? '-'}
				</div>
				<div>
					<span class="font-medium text-gray-700 dark:text-gray-300"
						>{labels.opponentAvgRating}:</span
					>
					{averageRatings.opponent ?? '-'}
				</div>
			</div>
		</div>

		{#if teamMatches.length === 0}
			<div
				class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-dark-bg"
			>
				<div class="p-8 text-center">
					<div class="text-gray-600 dark:text-gray-400">{labels.noMatches}</div>
				</div>
			</div>
		{:else}
			<TeamDetailMatches
				matches={teamMatches}
				allRoundResults={results.teamRoundResults}
				selectedClubId={team.clubId}
				selectedTeamNumber={team.teamNumber}
				getClubName={(clubId) => results.getClubName(clubId)}
				getPlayerName={(playerId, date) => results.getPlayerName(playerId, date)}
				getPlayerEloByDate={(playerId, date) => results.getPlayerEloByDate(playerId, date)}
				{tournamentId}
				{groupId}
			/>
		{/if}
	{/if}
</PageLayout>
