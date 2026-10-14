/**
 * Players by id and month, fetched once and shared across the app.
 *
 * Ports `GlobalPlayerCacheContext` (190 LOC). All of its `bump()` calls are gone:
 * the backing `PlayerDateCache` is a `SvelteMap`, so a read is reactive on its
 * own. What is left is fetching, de-duplication and negative caching.
 *
 * A module singleton rather than context state — it is one cache for the whole
 * session, and the results pages, the player pages and the group layout all want
 * the same entries.
 *
 * Holds state and actions only, no `$effect`, so it can be unit-tested directly.
 */
import {
	PlayerService,
	getMonthStartString,
	getPlayerDateCacheKey,
	normalizeEloLookupDate,
	type PlayerInfoDto
} from '$lib/api';
import { eloMonthDate } from '$lib/player/eloDate';
import { PlayerDateCache, type PlayerCacheStatus } from '$lib/player/playerDateCache.svelte';

export interface PlayerDateRequest {
	playerId: number;
	/** Unix ms; normalised to the first of its month before use. */
	date: number;
}

const cache = new PlayerDateCache();
let service: PlayerService | undefined;

function api(): PlayerService {
	// Constructed lazily so importing this module does no work.
	service ??= new PlayerService();
	return service;
}

function currentKey(playerId: number): string {
	return getPlayerDateCacheKey(playerId, normalizeEloLookupDate(Date.now()));
}

export const playerCache = {
	// --- Synchronous reads. Reactive: they re-run when a fetch lands. ---

	get(playerId: number): PlayerInfoDto | undefined {
		return cache.get(currentKey(playerId));
	},

	getByDate(playerId: number, date: number): PlayerInfoDto | undefined {
		return cache.get(getPlayerDateCacheKey(playerId, normalizeEloLookupDate(date)));
	},

	/** Distinguishes "not fetched" from "the API confirmed there is no record". */
	status(playerId: number, date?: number): PlayerCacheStatus {
		const key =
			date === undefined
				? currentKey(playerId)
				: getPlayerDateCacheKey(playerId, normalizeEloLookupDate(date));
		return cache.status(key);
	},

	// --- Fetching. Each is a no-op for anything already known, hit or miss. ---

	async fetchByDate(playerId: number, date: number): Promise<PlayerInfoDto | undefined> {
		const normalized = normalizeEloLookupDate(date);
		const key = getPlayerDateCacheKey(playerId, normalized);
		if (cache.has(key)) return cache.get(key);

		const response = await api().getPlayerInfo(playerId, eloMonthDate(normalized));
		cache.setFromResult(key, response.status === 200 ? response.data : null);
		return cache.get(key);
	},

	/**
	 * Fetch many (player, date) pairs, skipping anything already known.
	 *
	 * One `getPlayerInfoBatch` call: the SDK sends a single bulk request and,
	 * when the API rejects it over an id it does not know, falls back on its own,
	 * returning one result per pair. Anything not found — missing or failed — is
	 * negative-cached; otherwise a player the API cannot answer for is retried on
	 * every render forever.
	 */
	async fetchManyByDate(requests: PlayerDateRequest[]): Promise<void> {
		// Keyed by cache key, so a pair asked for twice in one call is fetched once.
		const missing: Record<string, PlayerDateRequest> = {};
		for (const request of requests) {
			const date = normalizeEloLookupDate(request.date);
			const key = getPlayerDateCacheKey(request.playerId, date);
			if (!cache.has(key)) missing[key] = { playerId: request.playerId, date };
		}
		const keys = Object.keys(missing);
		if (keys.length === 0) return;

		const results = await api()
			.getPlayerInfoBatch(
				keys
					.map((key) => missing[key])
					.map(({ playerId, date }) => ({
						id: playerId,
						date: getMonthStartString(date)
					}))
			)
			.catch(() => []);

		keys.forEach((key, i) => {
			const result = results[i];
			cache.setFromResult(key, result?.status === 200 ? result.data : null);
		});
	},

	/** Test seam — the cache is a module singleton and tests need a clean one. */
	_reset(): void {
		cache.clear();
	}
};
