/**
 * localStorage-backed preference for the JGP page: the division last looked at.
 * Ports `components/junior/juniorPrefs.ts`.
 *
 * The React version wrote its own `typeof window` and try/catch guards; those
 * live in `$lib/storage` now, so what is left is the key and validation.
 */
import { safeGetItem, safeSetItem } from '$lib/storage';
import type { JgpDivision } from '$lib/api/sthlm';

const DIVISION_KEY = 'junior-jgp-division';

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
