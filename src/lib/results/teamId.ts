/**
 * The `{contenderId}-{teamNumber}` pair a team's URL carries.
 *
 * A team is not identified by its club alone — a club can enter several teams in
 * one group — so the route segment has to carry both halves.
 *
 * The split is on the *first* dash rather than `split('-')`, because
 * `teamNumber` can be `-1`: the sentinel for a club with a single team, and for
 * loose-team events like Skol-SM where teams are not bound to one club. So
 * `"16322--1"` is a legitimate id meaning `{ clubId: 16322, teamNumber: -1 }`,
 * and splitting naively would read it as three empty-ish parts.
 */
export interface TeamRef {
	clubId: number;
	teamNumber: number;
}

/** The route segment for a team, e.g. `"38481-5"` or `"16322--1"`. */
export function formatTeamId(clubId: number, teamNumber: number): string {
	return `${clubId}-${teamNumber}`;
}

/**
 * Read a team route segment, or null when it is not one.
 *
 * Stricter than the React original, which used bare `parseInt` and so accepted
 * `"38481-5x"` as team 5 and `"3.7-5"` as club 3. Both halves must be whole
 * numbers and nothing else, since a wrong club id silently resolves to a
 * different team rather than to an error.
 */
export function parseTeamId(teamId: string | undefined): TeamRef | null {
	if (!teamId) return null;

	// `< 1` rejects both "no dash" and a leading dash — a club id is never negative.
	const dash = teamId.indexOf('-');
	if (dash < 1) return null;

	const clubId = wholeNumber(teamId.slice(0, dash));
	const teamNumber = wholeNumber(teamId.slice(dash + 1));
	if (clubId === null || teamNumber === null) return null;

	return { clubId, teamNumber };
}

function wholeNumber(value: string): number | null {
	if (!/^-?\d+$/.test(value)) return null;
	return Number(value);
}
