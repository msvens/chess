import { SvelteMap } from 'svelte/reactivity';
import type { PlayerInfoDto } from '$lib/api';

/** Cache state for a player(+date): not fetched, confirmed missing, or found. */
export type PlayerCacheStatus = 'unfetched' | 'missing' | 'found';

/**
 * Cache of players by id and month, keyed by the SDK's "playerId-YYYY-MM-01"
 * strings.
 *
 * The entries map is a `SvelteMap`, which is the whole reason this file moved to
 * `.svelte.ts`: reads become reactive, so a component showing a name simply
 * updates when the fetch lands. The React version could not do that — it held the
 * same Map in a `useRef` and forced re-renders with a `setVersion(v => v + 1)`
 * bump after every write, because React cannot observe ref mutation. Every one of
 * those bumps is gone; the API below is otherwise unchanged.
 *
 * A `null` entry is a NEGATIVE cache: the API confirmed there is no record
 * (it returns 204/404, e.g. a player with no rating at a given date). Recording
 * that — rather than leaving the key absent — is what stops the app from
 * refetching the same missing player forever, and lets the UI show "unknown"
 * instead of a perpetual "retrieving".
 */
export class PlayerDateCache {
	private readonly entries = new SvelteMap<string, PlayerInfoDto | null>();

	/** A key is a cache hit whether it resolved to a player OR to "missing". */
	has(key: string): boolean {
		return this.entries.has(key);
	}

	/** The player, or undefined for both "unfetched" and "confirmed missing". */
	get(key: string): PlayerInfoDto | undefined {
		return this.entries.get(key) ?? undefined;
	}

	status(key: string): PlayerCacheStatus {
		if (!this.entries.has(key)) return 'unfetched';
		return this.entries.get(key) ? 'found' : 'missing';
	}

	setFound(key: string, player: PlayerInfoDto): void {
		this.entries.set(key, player);
	}

	/** Negative-cache: record that this key has no record so we don't refetch. */
	setMissing(key: string): void {
		this.entries.set(key, null);
	}

	/**
	 * Drop everything. Only for tests — the app's cache is a session-long singleton
	 * and nothing in it goes stale within a session.
	 */
	clear(): void {
		this.entries.clear();
	}

	/** setFound when data is present, setMissing otherwise. */
	setFromResult(key: string, player: PlayerInfoDto | null | undefined): void {
		if (player) this.setFound(key, player);
		else this.setMissing(key);
	}
}
