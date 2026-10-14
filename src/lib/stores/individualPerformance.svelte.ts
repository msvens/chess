/**
 * The tournament-wide performance list — resultat.schack.se's "Individuella
 * resultat" — and the ratings it needs.
 *
 * The ranking is the SDK's `getIndividualPerformance`; what lives here is
 * getting it ratings without flooding the API. Each opponent's rating is wanted
 * as of their round's month. The results tables already answer most of those
 * (`ratingsToFetch`); the rest go to the player cache in one call, which the
 * SDK turns into a single bulk request where it can.
 *
 * State and actions only, so it can be tested by instantiating it; the route
 * calls `load`.
 */
import {
	getIndividualPerformance,
	hasIndividualPerformance,
	type IndividualPerformanceRow,
	type PlayerInfoDto,
	type TournamentDto
} from '$lib/api';
import { loadPrintData } from '$lib/print/printData';
import {
	namesToFetch,
	performanceInputs,
	ratingsToFetch,
	type PerformanceInputs
} from '$lib/results/individualPerformance';
import { parseDateToTimestamp } from '$lib/results/roundGrouping';
import { playerCache } from './playerCache.svelte';

export class IndividualPerformanceState {
	loading = $state(true);
	/** Set when the tournament itself could not be loaded. */
	failed = $state(false);
	tournament = $state.raw<TournamentDto | null>(null);

	#inputs = $state.raw<PerformanceInputs | null>(null);
	#token = 0;

	get available(): boolean {
		return this.tournament !== null && hasIndividualPerformance(this.tournament);
	}

	/** Empty until every rating has landed, so the list does not reshuffle as they do. */
	rows: IndividualPerformanceRow[] = $derived.by(() => {
		if (this.loading || !this.tournament || !this.#inputs || !this.available) return [];
		return getIndividualPerformance(this.tournament, this.#inputs.roundResults, (id, date) =>
			this.playerAt(id, date)
		);
	});

	/**
	 * A player's record for the name: their group's results table, or — in a
	 * team event, whose tables have none — the record fetched at their first game.
	 */
	playerOf(playerId: number): PlayerInfoDto | undefined {
		const firstGame = this.#inputs?.firstGame.get(playerId);
		return (
			this.#inputs?.snapshot.get(playerId) ??
			(firstGame ? playerCache.getByDate(playerId, parseDateToTimestamp(firstGame)) : undefined)
		);
	}

	/** The club shown beside a player: the team's in a team event, else the player's own. */
	clubOf(playerId: number): string | undefined {
		return this.#inputs?.teamClub.get(playerId) ?? this.playerOf(playerId)?.club;
	}

	/**
	 * A player's record as of a round: the rating list of that month where it was
	 * fetched, else the results table's. The fallback also covers a lookup that
	 * failed — school-only players have no dated record upstream.
	 */
	playerAt(playerId: number, roundDate: string): PlayerInfoDto | undefined {
		return (
			playerCache.getByDate(playerId, parseDateToTimestamp(roundDate)) ?? this.playerOf(playerId)
		);
	}

	async load(tournamentId: number): Promise<void> {
		const mine = ++this.#token;
		this.loading = true;
		this.failed = false;

		try {
			const data = await loadPrintData(tournamentId);
			if (mine !== this.#token) return;

			const inputs = performanceInputs(data.groups);
			this.tournament = data.tournament;
			this.#inputs = inputs;
			if (!this.available) return;

			await playerCache.fetchManyByDate(
				[...ratingsToFetch(data.tournament, inputs), ...namesToFetch(inputs)].map(
					({ playerId, roundDate }) => ({
						playerId,
						date: parseDateToTimestamp(roundDate)
					})
				)
			);
		} catch {
			if (mine !== this.#token) return;
			this.failed = true;
		} finally {
			if (mine === this.#token) this.loading = false;
		}
	}
}
