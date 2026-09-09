/**
 * Where a day popover opens so it stays on screen.
 *
 * Extracted from the `useLayoutEffect` in `DayEventsPopover.tsx`, which measured
 * the popover and wrote five style properties onto the node. The measuring still
 * has to happen in the component; the decision does not, and as a function it
 * can be checked against a viewport without a browser.
 *
 * The decision uses the *anchor's* geometry plus the popover's own size, never
 * the popover's current position — otherwise flipping would move the popover,
 * which would change the next measurement, which would flip it back.
 */

export interface Rect {
	top: number;
	bottom: number;
	left: number;
}

export interface Size {
	width: number;
	height: number;
}

export interface Viewport {
	width: number;
	height: number;
}

export interface Placement {
	/** Open upwards: there is not enough room below, and more room above. */
	dropUp: boolean;
	/** Align to the anchor's right edge: opening leftwards would overflow. */
	pinRight: boolean;
}

/** Breathing room kept between the popover and the edge of the window. */
export const MARGIN = 8;

export function placePopover(anchor: Rect, popover: Size, viewport: Viewport): Placement {
	const roomBelow = viewport.height - anchor.bottom;

	return {
		// Only flip up when it genuinely helps: a popover taller than the whole
		// window fits nowhere, and dropping it upwards would just clip the top,
		// which hides the date heading rather than the tail of the list.
		dropUp: roomBelow < popover.height + MARGIN && anchor.top > roomBelow,
		pinRight: anchor.left + popover.width + MARGIN > viewport.width
	};
}

/** The placement as CSS. Both axes are set every time, so no flip leaves a stale edge. */
export function placementStyle(placement: Placement): string {
	const vertical = placement.dropUp
		? 'top: auto; bottom: 100%; margin-top: 0; margin-bottom: 4px;'
		: 'top: 100%; bottom: auto; margin-top: 4px; margin-bottom: 0;';
	const horizontal = placement.pinRight ? 'left: auto; right: 0;' : 'left: 0; right: auto;';
	return `${vertical} ${horizontal}`;
}
