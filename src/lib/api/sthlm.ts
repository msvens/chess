/**
 * Stockholms Schackförbund's standings API — the official JGP standings.
 *
 * Same origin, like the other upstreams: `/api/sthlm/v1` is proxied to
 * https://verktyg.stockholmsschack.se/api/v1 (Vite in dev, nginx in prod),
 * which sends no CORS headers. It 404s on a trailing slash, so none is added.
 *
 * Only the current season is served (the calendar year), so there is no season
 * to ask for — just the division.
 */
import type { ApiResponse } from '$lib/api';

export type JgpDivision = 'open' | 'girls';

const ENDPOINTS: Record<JgpDivision, string> = {
	open: '/api/sthlm/v1/standings/jgp',
	girls: '/api/sthlm/v1/standings/flickornas'
};

export interface JgpStandingRow {
	/** Official placement, ties already broken by the documented rules. */
	placement: number;
	memberId: number;
	name: string;
	birthYear: number;
	club: string;
	/**
	 * Points per tournament id. A missing id means did not play (or the result
	 * was dropped); a 0 means played in the wrong class without dispensation —
	 * the two are shown differently.
	 */
	points: Record<number, number>;
	total: number;
}

export interface JgpTable {
	/** Age class (`2006-2009`, `2018 onward`); empty for the girls' single ranking. */
	label: string;
	rows: JgpStandingRow[];
}

export interface JgpSeasonStandings {
	lastUpdated: string;
	/** The season's tournaments, in column order. */
	tournamentIds: number[];
	tables: JgpTable[];
}

interface WireRow {
	placement: number;
	member_id: number;
	name: string;
	birth_year: number;
	club: string;
	tournaments: Record<string, number>;
	total_points: number;
}

interface WireStandings {
	last_updated: string;
	tournament_ids: number[];
	/** Open: keyed by age class. Girls: one flat list. */
	standings: Record<string, WireRow[]> | WireRow[];
}

const toRow = (row: WireRow): JgpStandingRow => ({
	placement: row.placement,
	memberId: row.member_id,
	name: row.name,
	birthYear: row.birth_year,
	club: row.club,
	points: row.tournaments,
	total: row.total_points
});

/**
 * Age classes youngest-born last, by their leading year. The file's own order
 * is lost on parse: JS puts integer-like keys (`2013`) ahead of the rest
 * (`2006-2009`), whatever order they arrived in.
 */
const byLeadingYear = (a: string, b: string): number => {
	const year = (label: string) => Number.parseInt(label, 10);
	const [ya, yb] = [year(a), year(b)];
	// A label without a year (none today) goes last rather than poisoning the sort.
	if (Number.isNaN(ya) || Number.isNaN(yb))
		return Number(Number.isNaN(ya)) - Number(Number.isNaN(yb));
	return ya - yb;
};

export function parseJgpStandings(wire: WireStandings): JgpSeasonStandings {
	const tables = Array.isArray(wire.standings)
		? [{ label: '', rows: wire.standings.map(toRow) }]
		: Object.keys(wire.standings)
				.sort(byLeadingYear)
				.map((label) => ({
					label,
					rows: (wire.standings as Record<string, WireRow[]>)[label].map(toRow)
				}));
	return { lastUpdated: wire.last_updated, tournamentIds: wire.tournament_ids, tables };
}

/** Like the SDK, never throws: failures come back as `error` with a status. */
export async function getJgpStandings(
	division: JgpDivision
): Promise<ApiResponse<JgpSeasonStandings>> {
	try {
		const res = await fetch(ENDPOINTS[division]);
		if (!res.ok) return { error: `HTTP ${res.status}`, status: res.status };
		return { data: parseJgpStandings((await res.json()) as WireStandings), status: res.status };
	} catch (err) {
		return { error: err instanceof Error ? err.message : String(err), status: 0 };
	}
}
