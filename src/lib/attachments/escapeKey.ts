import type { Attachment } from 'svelte/attachments';

/**
 * Calls `callback` when Escape is pressed anywhere on the page.
 *
 * Listens on document rather than the node so it fires whether or not focus is
 * inside the menu — the React version this ports did the same, and a dropdown
 * opened by mouse usually has focus elsewhere.
 *
 * ```svelte
 * <div {@attach escapeKey(() => (open = false))}>…</div>
 * ```
 */
export function escapeKey(callback: () => void): Attachment<HTMLElement> {
	return () => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') callback();
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	};
}
