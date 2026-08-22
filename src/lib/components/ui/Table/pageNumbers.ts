/**
 * Which page buttons to show, and where the ellipses go.
 *
 * Extracted from the React `Pagination` so the windowing can be tested directly —
 * it is the only non-obvious part of the component.
 */
export type PageToken = number | 'ellipsis';

export function pageNumbers(currentPage: number, totalPages: number, maxButtons = 7): PageToken[] {
	if (totalPages <= 1) return totalPages === 1 ? [1] : [];
	if (totalPages <= maxButtons) {
		return Array.from({ length: totalPages }, (_, i) => i + 1);
	}

	// First and last are always shown, plus up to two ellipses; the rest is the
	// window around the current page.
	const pages: PageToken[] = [1];
	const side = Math.floor((maxButtons - 3) / 2);

	let start = Math.max(2, currentPage - side);
	let end = Math.min(totalPages - 1, currentPage + side);

	// Near either end, grow the window the other way so the button count stays put
	// instead of collapsing.
	if (currentPage <= side + 2) end = Math.min(totalPages - 1, maxButtons - 2);
	if (currentPage >= totalPages - side - 1) start = Math.max(2, totalPages - maxButtons + 3);

	// If an ellipsis would stand in for a single page, show that page instead — the
	// "..." costs the same width and tells you less. The React original did this at
	// e.g. page 5 of 9, rendering `1 … 3 4 5 6 7 … 9` to hide only 2 and 8.
	if (start === 3) start = 2;
	if (end === totalPages - 2) end = totalPages - 1;

	if (start > 2) pages.push('ellipsis');
	for (let i = start; i <= end; i++) pages.push(i);
	if (end < totalPages - 1) pages.push('ellipsis');
	pages.push(totalPages);

	return pages;
}
