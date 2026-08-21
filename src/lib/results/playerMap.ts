/**
 * Indexing the players named by a group's standings.
 *
 * A plain module: this is a derived lookup rebuilt from its input, not state, and
 * keeping it out of the reactive store means no `Map` in a `.svelte.ts` file
 * pretending to be reactive.
 */
import type { PlayerInfoDto, TournamentEndResultDto } from '$lib/api';

/**
 * Players carried by individual standings rows, by id.
 *
 * Team standings do not carry player info at all — those are filled in lazily
 * through the player cache as matches are expanded — so this is empty for them,
 * by design rather than by accident.
 */
export function buildPlayerMap(results: TournamentEndResultDto[]): Map<number, PlayerInfoDto> {
	const map = new Map<number, PlayerInfoDto>();
	for (const result of results) {
		if (result.playerInfo) map.set(result.playerInfo.id, result.playerInfo);
	}
	return map;
}
