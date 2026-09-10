/**
 * Loads and scores one JGP season. Ports `lib/junior/useJgpStandings.ts`.
 *
 * Holds state and actions only — no `$effect` — so it can be tested by
 * instantiating it. The page owns the one effect, which waits for the
 * organizations data before calling `load`: without club data every player
 * resolves to no district and the whole table would be filtered away.
 *
 * The eligibility rule and the session cache are plain modules under
 * `$lib/junior/`; what is reactive here is only whether the tables have arrived.
 */
import type { JgpSeason } from '$lib/data/jgp/types';
import { stockholmEligibility, type ClubLookup } from '$lib/junior/eligibility';
import type { JgpAgeClassTable, JgpPlayerResult } from '$lib/junior/jgpEngine';
import { loadSeasonStandings } from '$lib/junior/jgpStandings';
import { SeasonTableCache } from '$lib/junior/seasonCache';

export type SeasonLoader = (
	season: JgpSeason,
	isEligible: (row: JgpPlayerResult) => boolean
) => Promise<JgpAgeClassTable[]>;

export class JgpStandingsState {
	tables = $state<JgpAgeClassTable[] | null>(null);
	loading = $state(false);
	/** A message, not a flag: this loader can fail for reasons worth showing. */
	error = $state<string | null>(null);

	#cache = new SeasonTableCache();

	/** Which load is current, so a slow one cannot overwrite a newer one. */
	#generation = 0;

	constructor(private readonly loader: SeasonLoader = loadSeasonStandings) {}

	async load(season: JgpSeason, getClub: ClubLookup): Promise<void> {
		const mine = ++this.#generation;

		const cached = this.#cache.get(season);
		if (cached) {
			this.tables = cached;
			this.loading = false;
			this.error = null;
			return;
		}

		this.loading = true;
		this.error = null;
		this.tables = null;

		try {
			const tables = await this.loader(season, stockholmEligibility(season, getClub));
			if (mine !== this.#generation) return;
			this.#cache.set(season, tables);
			this.tables = tables;
		} catch (err) {
			if (mine !== this.#generation) return;
			// Unlike the SDK, this loader really can throw: it fans out over the
			// results endpoints and normalises what comes back.
			this.error = err instanceof Error ? err.message : String(err);
		} finally {
			if (mine === this.#generation) this.loading = false;
		}
	}
}
