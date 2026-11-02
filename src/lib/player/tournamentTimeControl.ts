/**
 * What a player's tournaments were played at, for the filter on their
 * Individual and Team tabs.
 *
 * Per group, not per game: a tournament with standard and rapid rounds is
 * neither, so it gets a kind of its own. The Opponents tab filters single games
 * and keeps its own classification.
 */
import { findTournamentGroup, getGroupTimeControl, type TournamentClassGroupDto } from '$lib/api';
import { isEloGroup } from '$lib/results/tournamentElo';
import type { TournamentParticipation } from './participations';

export type TournamentTimeControl = 'standard' | 'rapid' | 'blitz' | 'mixed' | 'unrated';

export type TournamentTimeControlCounts = Record<'all' | TournamentTimeControl, number>;

/**
 * Unrated exactly when the group's own page hides its Elo (`isEloGroup`); mixed
 * when its rounds are rated at more than one type; otherwise the one type.
 */
export function tournamentTimeControl(group: TournamentClassGroupDto): TournamentTimeControl {
	if (!isEloGroup(group)) return 'unrated';
	const { primary, roundTypes } = getGroupTimeControl(group);
	if (roundTypes.length > 1) return 'mixed';
	// `isEloGroup` has already ruled out 'unknown'.
	return primary === 'unknown' ? 'unrated' : primary;
}

/** Null when the row's tournament no longer lists its group: it counts under "all" only. */
function timeControlOf(row: TournamentParticipation): TournamentTimeControl | null {
	const found = findTournamentGroup(row.tournament, row.groupId);
	return found ? tournamentTimeControl(found.group) : null;
}

export function countByTimeControl(
	rows: readonly TournamentParticipation[]
): TournamentTimeControlCounts {
	const counts: TournamentTimeControlCounts = {
		all: rows.length,
		standard: 0,
		rapid: 0,
		blitz: 0,
		mixed: 0,
		unrated: 0
	};
	for (const row of rows) {
		const kind = timeControlOf(row);
		if (kind) counts[kind] += 1;
	}
	return counts;
}

export function filterByTimeControl(
	rows: TournamentParticipation[],
	selected: 'all' | TournamentTimeControl
): TournamentParticipation[] {
	if (selected === 'all') return rows;
	return rows.filter((row) => timeControlOf(row) === selected);
}
