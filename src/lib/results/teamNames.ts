/**
 * Naming a team from the standings rows it appears in.
 *
 * A row identifies its contender through exactly one of two fields: `club` for
 * ordinary club events, or `team` for "loosely-coupled" ones — Skollags-SM and
 * the like, where a team is a school rather than a club. The SDK's
 * `createStandingsTeamNameFormatter` reads whichever is set and applies the
 * Roman-numeral rule, so nothing here needs a club-name lookup: the names now
 * travel on the rows themselves.
 *
 * This adds only the fallback. The SDK returns `null` for a `contenderId` that
 * is not in the standings, and every caller wants a string, so the id itself is
 * rendered instead — it is the only identifying thing left, and it beats a dash
 * that throws it away. Prefixing it, as the old club lookup did with
 * `Org 16196`, would be wrong for a school event: there the number is a team id
 * and names an unrelated organisation.
 *
 * Unreachable in practice on sound data. Round results carry the same
 * `contenderId`s as the standings, and the one id that is absent — the `-100`
 * bye sentinel — is labelled by callers before they ask for a name.
 */
import { createStandingsTeamNameFormatter, type TeamTournamentEndResultDto } from '$lib/api';

/** What every team table and sheet takes: a name for an id, always a string. */
export type TeamNameFormatter = (contenderId: number, teamNumber: number) => string;

type NameableRow = Pick<TeamTournamentEndResultDto, 'contenderId' | 'teamNumber' | 'club' | 'team'>;

/** Names teams from `rows`, falling back to the bare id for an unknown one. */
export function teamNameOrId(rows: readonly NameableRow[]): TeamNameFormatter {
	const format = createStandingsTeamNameFormatter(rows);
	return (contenderId, teamNumber) => format(contenderId, teamNumber) ?? String(contenderId);
}
