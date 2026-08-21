/**
 * Turning tournaments into table rows.
 *
 * Pure, because the date formatting here had a real bug worth pinning down: the
 * React version built the "last updated" cell from `toISOString()` for the date
 * and `toTimeString()` for the time — UTC and local respectively. Between
 * midnight and 02:00 Swedish time those disagree and the row shows the previous
 * day's date beside this morning's time.
 */
import type { TournamentDto } from '$lib/api';

export interface TournamentRow {
	tournamentId: number;
	name: string;
	club: string;
	start: string;
	end: string;
	lastUpdatedDate: string;
	lastUpdatedTime: string;
}

function pad(n: number): string {
	return String(n).padStart(2, '0');
}

function toLocalDateString(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toLocalTimeString(d: Date): string {
	return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** YYYY-MM-DD in local time, or "-" for an empty or unparseable value. */
export function formatDate(value: string | null | undefined): string {
	if (!value) return '-';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '-';
	return toLocalDateString(date);
}

/** Date and time, both in local time — see the note at the top of this file. */
export function formatTimestamp(value: string | null | undefined): { date: string; time: string } {
	if (!value) return { date: '-', time: '' };
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return { date: '-', time: '' };
	return { date: toLocalDateString(d), time: toLocalTimeString(d) };
}

export function toTournamentRows(
	tournaments: TournamentDto[],
	getOrganizerName: (orgType: number, orgNumber: number) => string
): TournamentRow[] {
	return tournaments.map((tournament) => {
		const updated = formatTimestamp(tournament.latestUpdated);
		return {
			tournamentId: tournament.id,
			name: tournament.name,
			club:
				tournament.orgType != null && tournament.orgNumber
					? getOrganizerName(tournament.orgType, tournament.orgNumber)
					: '-',
			start: formatDate(tournament.start),
			end: formatDate(tournament.end),
			lastUpdatedDate: updated.date,
			lastUpdatedTime: updated.time
		};
	});
}
