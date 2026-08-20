/**
 * UI language. A module singleton for the same reason as the theme: it is a single
 * global truth, read by 44 call sites in the Next app via `useLanguage()`.
 *
 * The React version deferred its localStorage read into a `useEffect` purely to dodge
 * an SSR hydration mismatch. This is a client-rendered SPA, so that concern does not
 * exist — but the read still happens in `initLanguage()` rather than at module scope,
 * so importing this module never touches storage (which keeps it testable).
 */
import { DEFAULT_LANGUAGE, isLanguage, type Language } from '$lib/i18n';
import { safeGetItem, safeSetItem } from '$lib/storage';

const KEY = 'language';

let current = $state<Language>(DEFAULT_LANGUAGE);

export const language = {
	get current(): Language {
		return current;
	},
	set(next: Language) {
		current = next;
		safeSetItem(KEY, next);
	},
	toggle() {
		language.set(current === 'sv' ? 'en' : 'sv');
	}
};

/** Adopt the persisted choice. Call once on mount. */
export function initLanguage(): void {
	const saved = safeGetItem(KEY);
	current = isLanguage(saved) ? saved : DEFAULT_LANGUAGE;
}
