/**
 * localStorage-backed preferences for the JGP page: the division and the season
 * year last looked at. Ports `components/junior/juniorPrefs.ts`.
 *
 * The React version wrote its own `typeof window` and try/catch guards; those
 * live in `$lib/storage` now, so what is left is the two keys and validation.
 */
import { safeGetItem, safeSetItem } from '$lib/storage';
import type { JgpDivision } from '$lib/data/jgp/types';

const DIVISION_KEY = 'junior-jgp-division';
const YEAR_KEY = 'junior-jgp-year';

export const JGP_DIVISIONS: readonly JgpDivision[] = ['open', 'girls'];

export function isDivision(value: string | null | undefined): value is JgpDivision {
	return !!value && (JGP_DIVISIONS as readonly string[]).includes(value);
}

/** The division to open with: the last one used, else the open series. */
export function initialDivision(): JgpDivision {
	const saved = safeGetItem(DIVISION_KEY);
	return isDivision(saved) ? saved : 'open';
}

export function saveDivision(division: JgpDivision): void {
	safeSetItem(DIVISION_KEY, division);
}

/**
 * The season to open with: the one last looked at if that division still has
 * it, else its newest. One key across both divisions, as the React version had
 * it — with a season each, a shared year is more often right than not.
 */
export function initialYear(available: number[]): number | null {
	const saved = safeGetItem(YEAR_KEY);
	const year = saved ? Number.parseInt(saved, 10) : Number.NaN;
	if (Number.isFinite(year) && available.includes(year)) return year;
	return available[0] ?? null;
}

export function saveYear(year: number): void {
	safeSetItem(YEAR_KEY, String(year));
}
