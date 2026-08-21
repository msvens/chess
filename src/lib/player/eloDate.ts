/**
 * Turning a timestamp into the Date the rating endpoints expect.
 *
 * A plain module, not part of the reactive cache: these are transient arguments
 * to a fetch, never state. Keeping them here also keeps `new Date` out of a
 * `.svelte.ts` file, where it would read as reactive state and isn't.
 */
import { normalizeEloLookupDate } from '$lib/api';

/**
 * The first of the month the timestamp falls in.
 *
 * Ratings are published monthly, so every lookup within a month is the same
 * lookup — which is also what makes the cache key collapse.
 */
export function eloMonthDate(ms: number): Date {
	return new Date(normalizeEloLookupDate(ms));
}
