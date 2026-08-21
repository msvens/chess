/**
 * Turning a flat list of round results into what the round tabs need.
 *
 * The API answers with every game of every round in one array. The page shows
 * one round at a time, so it needs the games indexed by round, the round numbers
 * in order, and — before it can show ratings — the (player, month) pairs whose
 * historical ratings have to be warmed.
 *
 * Pure functions in a plain module: none of this is state, and all of it has
 * edge cases worth pinning (a missing `roundNr`, an unparseable date, a bye).
 */
import { getOpponentKind, normalizeEloLookupDate, type TournamentRoundResultDto } from '$lib/api';

/** A player whose rating is wanted as of a given month. */
export interface PlayerDateLookup {
	playerId: number;
	date: number;
}

/**
 * Epoch ms from whatever the API put in a date field.
 *
 * It is inconsistent: some rows carry an ISO-ish string, others an epoch number
 * that arrives as a string. A numeric string wins, because `new Date('1737')`
 * parses as the year 1737 rather than failing, which would silently produce a
 * date three centuries off.
 *
 * A numeric string that is not a usable timestamp is rejected outright rather
 * than handed to `Date`. The React version fell through, so a `'0'` in a date
 * field became the year 2000 and printed as a real round date.
 */
export function parseDateToTimestamp(dateStr: string | undefined): number {
	if (!dateStr) return NaN;
	const asNumber = Number(dateStr);
	if (!Number.isNaN(asNumber)) return asNumber > 0 ? asNumber : NaN;
	return new Date(dateStr).getTime();
}

/** Compact date under a round tab, e.g. "25-01-15". Empty when unparseable. */
export function formatRoundDate(dateStr: string | undefined, locale: string): string {
	const timestamp = parseDateToTimestamp(dateStr);
	if (Number.isNaN(timestamp) || timestamp <= 0) return '';
	return new Date(timestamp).toLocaleDateString(locale, {
		day: 'numeric',
		month: 'numeric',
		year: '2-digit'
	});
}

/**
 * Games by round number.
 *
 * A row without `roundNr` is treated as round 1 rather than dropped — the field
 * is absent on some older events, and losing their only round would leave the
 * page claiming there are no results at all.
 */
export function groupByRound(
	rows: readonly TournamentRoundResultDto[]
): Map<number, TournamentRoundResultDto[]> {
	const byRound = new Map<number, TournamentRoundResultDto[]>();
	for (const row of rows) {
		const round = row.roundNr || 1;
		const existing = byRound.get(round);
		if (existing) existing.push(row);
		else byRound.set(round, [row]);
	}
	return byRound;
}

/**
 * The round numbers present, ascending.
 *
 * Derived from the rows rather than from `groupByRound`, so it works for team
 * events too — their games live in a separate array the individual grouping
 * never sees.
 */
export function roundNumbers(rows: readonly TournamentRoundResultDto[]): number[] {
	return [...new Set(rows.map((row) => row.roundNr || 1))].sort((a, b) => a - b);
}

/**
 * The round to show, given what the visitor picked and what exists.
 *
 * An explicit choice only counts while that round is still on offer; otherwise
 * the latest round wins, which is what someone checking on an event wants — even
 * when it has no results in yet.
 *
 * The React page took `selected ?? last`, which went wrong two ways. Its results
 * page stays mounted across group changes, so round 7 of a long event survived
 * into a three-round group and rendered an empty table; and a live refresh that
 * dropped a round did the same to whoever was looking at it.
 */
export function resolveActiveRound(
	selected: number | null,
	rounds: readonly number[]
): number | null {
	if (selected != null && rounds.includes(selected)) return selected;
	return rounds[rounds.length - 1] ?? null;
}

/**
 * Which historical ratings a round's games need.
 *
 * Bye and walkover slots are dropped: they are encoded as negative ids, and
 * schack.se answers those with a 502 rather than a "no such player".
 *
 * Dates are normalised to the month the rating list belongs to, which also
 * folds a round's games down to one lookup per player.
 */
export function playerDateLookups(
	games: readonly TournamentRoundResultDto[] | undefined
): PlayerDateLookup[] {
	const lookups: PlayerDateLookup[] = [];
	for (const game of games ?? []) {
		const roundDate = parseDateToTimestamp(game.date);
		if (Number.isNaN(roundDate) || roundDate <= 0) continue;

		const date = normalizeEloLookupDate(roundDate);
		if (getOpponentKind(game.homeId) === 'paired') lookups.push({ playerId: game.homeId, date });
		if (getOpponentKind(game.awayId) === 'paired') lookups.push({ playerId: game.awayId, date });
	}
	return lookups;
}
