/**
 * Tournaments by group id.
 *
 * Ports `GlobalTournamentCacheContext` (97 LOC), and like the player cache it
 * loses its `useRef` + `setVersion` bump entirely: a `SvelteMap` read is reactive
 * on its own.
 *
 * Exists because a list of groups — a player's tournament history, say — needs
 * the tournament each group belongs to, and the same tournament usually covers
 * several of them.
 */
import { SvelteMap } from 'svelte/reactivity';
import { TournamentService, type TournamentDto } from '$lib/api';

const byGroup = new SvelteMap<number, TournamentDto>();
let service: TournamentService | undefined;

function api(): TournamentService {
	service ??= new TournamentService();
	return service;
}

export const tournamentCache = {
	/** Reactive read — re-runs when a fetch lands. */
	get(groupId: number): TournamentDto | undefined {
		return byGroup.get(groupId);
	},

	/**
	 * Fetch any group ids not already held.
	 *
	 * Returns nothing: reads are reactive now, so a caller awaits this and then
	 * uses `get()`. The React version had to return a Map because its reads were
	 * not reactive and the caller needed the values in hand — that requirement is
	 * gone, and with it a whole result map to assemble and thread around.
	 */
	async fetchMany(groupIds: number[]): Promise<void> {
		const missing = groupIds.filter((id) => !byGroup.has(id));
		if (missing.length === 0) return;

		const responses = await api().getTournamentFromGroupBatch(missing);
		responses.forEach((response, i) => {
			// Skip ids the batch could not resolve rather than caching undefined,
			// so a later attempt can still succeed.
			if (response.data) byGroup.set(missing[i], response.data);
		});
	},

	/**
	 * Seed the cache from a tournament already in hand, so a page that has just
	 * fetched one does not make the next page fetch it again.
	 *
	 * First write wins: an existing entry is left alone.
	 */
	add(groupId: number, tournament: TournamentDto): void {
		if (!byGroup.has(groupId)) byGroup.set(groupId, tournament);
	},

	/** Test seam — the cache is a module singleton. */
	_reset(): void {
		byGroup.clear();
	}
};
