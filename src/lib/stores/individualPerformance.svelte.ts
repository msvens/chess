/**
 * The tournament-wide performance list — resultat.schack.se's "Individuella
 * resultat" — and the ratings it needs.
 *
 * The ranking is the SDK's `getIndividualPerformance`; what lives here is
 * getting it ratings without flooding the API. Each opponent's rating is wanted
 * as of their round's month. The results tables already answer most of those
 * (`ratingsToFetch`); the rest are fetched a few at a time, since the player
 * cache fires whatever it is handed at once.
 *
 * State and actions only, so it can be tested by instantiating it; the route
 * calls `load`.
 */
import {
	getIndividualPerformance,
	type IndividualPerformanceRow,
	type PlayerInfoDto,
	type TournamentDto
} from '$lib/api';
import { loadPrintData } from '$lib/print/printData';
import {
	hasIndividualPerformance,
	performanceInputs,
	ratingsToFetch,
	type PerformanceInputs
} from '$lib/results/individualPerformance';
import { parseDateToTimestamp } from '$lib/results/roundGrouping';
import { playerCache } from './playerCache.svelte';

/** Rating requests in flight at once. */
export const RATING_BATCH_SIZE = 10;

export class IndividualPerformanceState {
	loading = $state(true);
	/** Set when the tournament itself could not be loaded. */
	failed = $state(false);
	tournament = $state.raw<TournamentDto | null>(null);
	/** Historical ratings fetched so far, and how many are needed. */
	fetched = $state(0);
	total = $state(0);

	#inputs = $state.raw<PerformanceInputs | null>(null);
	#token = 0;

	get available(): boolean {
		return hasIndividualPerformance(this.tournament);
	}

	/** Empty until every rating has landed, so the list does not reshuffle as they do. */
	rows: IndividualPerformanceRow[] = $derived.by(() => {
		if (this.loading || !this.tournament || !this.#inputs || !this.available) return [];
		return getIndividualPerformance(this.tournament, this.#inputs.roundResults, (id, date) =>
			this.playerAt(id, date)
		);
	});

	/** A player as their group's results table has them, for the name and club. */
	playerOf(playerId: number): PlayerInfoDto | undefined {
		return this.#inputs?.snapshot.get(playerId);
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
		this.fetched = 0;
		this.total = 0;

		try {
			const data = await loadPrintData(tournamentId);
			if (mine !== this.#token) return;

			const inputs = performanceInputs(data.groups);
			this.tournament = data.tournament;
			this.#inputs = inputs;
			if (!this.available) return;

			const needed = ratingsToFetch(data.tournament, inputs);
			this.total = needed.length;

			for (let start = 0; start < needed.length; start += RATING_BATCH_SIZE) {
				const batch = needed.slice(start, start + RATING_BATCH_SIZE);
				await playerCache.fetchManyByDate(
					batch.map(({ playerId, roundDate }) => ({
						playerId,
						date: parseDateToTimestamp(roundDate)
					}))
				);
				if (mine !== this.#token) return;
				this.fetched += batch.length;
			}
		} catch {
			if (mine !== this.#token) return;
			this.failed = true;
		} finally {
			if (mine === this.#token) this.loading = false;
		}
	}
}
