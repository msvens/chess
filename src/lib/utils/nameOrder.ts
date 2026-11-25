/**
 * The one A–Z for names across the app: tournaments (calendar, day list,
 * `/today`, the List tab), players and clubs in the results tables, teams,
 * districts, and the seeding's tie-break.
 *
 * Swedish collation whatever the interface language, since the names are
 * Swedish: Å, Ä, Ö after Z and in that order, case ignored. Plain `<` on the
 * strings would put Ä before Å, and English collation files Å and Ä under A.
 */
import type { TournamentDto } from '$lib/api';

const collator = new Intl.Collator('sv', { sensitivity: 'base' });

export function compareNames(a: string, b: string): number {
	return collator.compare(a, b);
}

/** A–Z by name; the id settles a tie, so the order never wobbles. */
export function byName(
	a: Pick<TournamentDto, 'name' | 'id'>,
	b: Pick<TournamentDto, 'name' | 'id'>
): number {
	return compareNames(a.name, b.name) || a.id - b.id;
}
