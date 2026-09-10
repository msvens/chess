/**
 * Who counts towards the Stockholm JGP series.
 *
 * A player qualifies through their club's district — or by being listed as an
 * exception, which is how a secondary Stockholm membership is recorded: the
 * results API exposes only the main club, so those are maintained per season.
 */
import type { ClubDTO } from '$lib/api';
import type { JgpSeason } from '$lib/data/jgp/types';
import type { JgpPlayerResult } from './jgpEngine';

/** Stockholm chess district id — the eligibility boundary for the series. */
export const STOCKHOLM_DISTRICT_ID = 5821;

export type ClubLookup = (clubId: number) => ClubDTO | undefined;

export function stockholmEligibility(
	season: JgpSeason,
	getClub: ClubLookup
): (row: JgpPlayerResult) => boolean {
	const exceptions = new Set(season.clubExceptions.map((e) => e.memberId));
	return (row) =>
		exceptions.has(row.memberId) ||
		Boolean(
			// A club keeps its historical district rows, so only an active one counts.
			getClub(row.clubId)?.districts?.some(
				(m) => m.districtid === STOCKHOLM_DISTRICT_ID && m.active === 1
			)
		);
}
