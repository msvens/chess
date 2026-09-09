import { describe, expect, it } from 'vitest';
import { MARGIN, placePopover, placementStyle, type Rect } from './popoverPlacement';

const VIEWPORT = { width: 1024, height: 768 };
const POPOVER = { width: 256, height: 200 };

/** A day cell somewhere in the middle of the grid. */
const middle: Rect = { top: 300, bottom: 396, left: 400 };

describe('which way the popover opens', () => {
	it('drops down when there is room', () => {
		expect(placePopover(middle, POPOVER, VIEWPORT)).toEqual({ dropUp: false, pinRight: false });
	});

	it('flips up on the bottom row', () => {
		const bottom: Rect = { top: 640, bottom: 736, left: 400 };
		expect(placePopover(bottom, POPOVER, VIEWPORT).dropUp).toBe(true);
	});

	it('stays down when the space below is only just enough', () => {
		// bottom + height + MARGIN exactly fills the viewport.
		const snug: Rect = { top: 400, bottom: VIEWPORT.height - POPOVER.height - MARGIN, left: 400 };
		expect(placePopover(snug, POPOVER, VIEWPORT).dropUp).toBe(false);
	});

	it('stays down when there is no more room above than below', () => {
		// A popover taller than the window fits nowhere. Flipping up would clip the
		// date heading instead of the tail of the list, which is worse.
		const tall = { width: 256, height: 900 };
		const nearTop: Rect = { top: 10, bottom: 106, left: 400 };
		expect(placePopover(nearTop, tall, VIEWPORT).dropUp).toBe(false);
	});
});

describe('which edge the popover aligns to', () => {
	it('opens leftwards when there is room', () => {
		expect(placePopover(middle, POPOVER, VIEWPORT).pinRight).toBe(false);
	});

	it('pins right in the last column', () => {
		const lastColumn: Rect = { top: 300, bottom: 396, left: 900 };
		expect(placePopover(lastColumn, POPOVER, VIEWPORT).pinRight).toBe(true);
	});

	it('pins right as soon as the margin would be eaten', () => {
		const edge: Rect = { top: 300, bottom: 396, left: VIEWPORT.width - POPOVER.width - MARGIN + 1 };
		expect(placePopover(edge, POPOVER, VIEWPORT).pinRight).toBe(true);
	});

	it('does both at once in the bottom-right corner', () => {
		const corner: Rect = { top: 640, bottom: 736, left: 900 };
		expect(placePopover(corner, POPOVER, VIEWPORT)).toEqual({ dropUp: true, pinRight: true });
	});

	it('pins right on a phone, where nothing fits beside the anchor', () => {
		const phone = { width: 390, height: 844 };
		const cell: Rect = { top: 300, bottom: 396, left: 200 };
		expect(placePopover(cell, POPOVER, phone).pinRight).toBe(true);
	});
});

describe('the style it produces', () => {
	it('sets both axes whichever way it went, so no flip leaves a stale edge', () => {
		for (const dropUp of [true, false]) {
			for (const pinRight of [true, false]) {
				const style = placementStyle({ dropUp, pinRight });
				for (const property of ['top:', 'bottom:', 'left:', 'right:']) {
					expect(style).toContain(property);
				}
			}
		}
	});

	it('hangs the popover below the anchor by default', () => {
		expect(placementStyle({ dropUp: false, pinRight: false })).toContain('top: 100%');
	});

	it('hangs it above when flipped', () => {
		expect(placementStyle({ dropUp: true, pinRight: false })).toContain('bottom: 100%');
	});

	it('keeps the gap on whichever side it hangs from', () => {
		expect(placementStyle({ dropUp: false, pinRight: false })).toContain('margin-top: 4px');
		expect(placementStyle({ dropUp: true, pinRight: false })).toContain('margin-bottom: 4px');
	});
});
