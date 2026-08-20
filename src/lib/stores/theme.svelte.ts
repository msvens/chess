/**
 * Light/dark theme. A module singleton (global client state) rather than a context
 * store, so the pre-paint script in `app.html` and the app read the same source.
 *
 * Behaviour is carried over from the Next app deliberately: the visitor's explicit
 * choice in localStorage wins, and the default is DARK. This app does not follow
 * `prefers-color-scheme` — adopting the OS setting would be a product change, not a
 * migration side effect, so it is left alone here.
 *
 * Holds state + actions only (no `$effect`, no timers) so it can be unit-tested by
 * importing it directly. The root layout owns the side effects.
 */
import { safeGetItem, safeSetItem } from '$lib/storage';

export type Theme = 'light' | 'dark';

const KEY = 'theme';
const DEFAULT: Theme = 'dark';

let current = $state<Theme>(DEFAULT);

export const theme = {
	/** The theme to apply right now. */
	get current(): Theme {
		return current;
	},
	set(next: Theme) {
		current = next;
		safeSetItem(KEY, next);
	},
	toggle() {
		theme.set(current === 'dark' ? 'light' : 'dark');
	}
};

/**
 * Adopt the persisted choice. Call once on mount; `app.html` has already applied the
 * same value to `<html>` before first paint, so this only syncs the store to it.
 */
export function initTheme(): void {
	const saved = safeGetItem(KEY);
	current = saved === 'light' || saved === 'dark' ? saved : DEFAULT;
}
