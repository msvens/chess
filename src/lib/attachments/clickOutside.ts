import type { Attachment } from 'svelte/attachments';

/**
 * Calls `callback` when a mousedown lands outside the element.
 *
 * Mousedown rather than click, so a dropdown closes before the click completes —
 * otherwise clicking a control behind the menu would only dismiss it.
 *
 * ```svelte
 * <div {@attach clickOutside(() => (open = false))}>…</div>
 * ```
 */
export function clickOutside(callback: () => void): Attachment<HTMLElement> {
	return (node) => {
		const onMouseDown = (event: MouseEvent) => {
			if (!node.contains(event.target as Node)) callback();
		};
		document.addEventListener('mousedown', onMouseDown);
		return () => document.removeEventListener('mousedown', onMouseDown);
	};
}
