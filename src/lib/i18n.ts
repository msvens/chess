/**
 * The language axis, on its own so the agnostic layer doesn't depend on state.
 *
 * In the Next app this type lived in `context/LanguageContext.tsx`, which meant
 * `translations.ts` — 2,000 lines of pure data — imported from a React context
 * purely for a two-member union. Keeping it here lets translations, formatters
 * and anything else agnostic stay free of the store.
 */
export type Language = 'en' | 'sv';

/** The app has always defaulted to Swedish. */
export const DEFAULT_LANGUAGE: Language = 'sv';

export function isLanguage(value: unknown): value is Language {
	return value === 'en' || value === 'sv';
}

/**
 * BCP-47 tag for `Intl` formatting.
 *
 * The bare subtags would resolve to the same thing today, but only by accident
 * of the runtime's default region — `'en'` picking `en-US` is not guaranteed.
 * Naming the regions makes the dates and times the app prints deterministic.
 */
export function localeOf(language: Language): string {
	return language === 'sv' ? 'sv-SE' : 'en-US';
}
