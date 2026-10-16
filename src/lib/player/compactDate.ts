import { parseLocalDate } from '$lib/api';

/**
 * `2025-06-27` → `2025-6-27`: ISO order without the leading zeros, which is
 * what a narrow column has room for. Anything unparseable comes back as given.
 */
export function compactDate(value: string): string {
	const date = parseLocalDate(value);
	if (Number.isNaN(date.getTime())) return value;
	return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
