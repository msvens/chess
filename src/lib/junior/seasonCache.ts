/**
 * Computed standings, kept for the session so switching division or year back
 * and forth costs nothing.
 *
 * Keyed by year and division rather than by season object: the page rebuilds
 * its `season` on every division change, and a season's inputs are fixed once
 * the config is published. Nothing here is reactive — the store assigns what it
 * gets back to its own `$state`.
 */
import type { JgpSeason } from '$lib/data/jgp/types';
import type { JgpAgeClassTable } from './jgpEngine';

export class SeasonTableCache {
	#entries = new Map<string, JgpAgeClassTable[]>();

	static keyOf(season: JgpSeason): string {
		return `${season.year}-${season.division}`;
	}

	get(season: JgpSeason): JgpAgeClassTable[] | undefined {
		return this.#entries.get(SeasonTableCache.keyOf(season));
	}

	set(season: JgpSeason, tables: JgpAgeClassTable[]): void {
		this.#entries.set(SeasonTableCache.keyOf(season), tables);
	}
}
