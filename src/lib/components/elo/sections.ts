import type { Translations } from '$lib/translations';

export type EloSectionId = 'basics' | 'calculation' | 'fine-print' | 'calculator';

export interface EloSection {
	id: EloSectionId;
	path: string;
	label: (t: Translations) => string;
}

/** The four Elo pages, in sidebar order. */
export const ELO_SECTIONS: readonly EloSection[] = [
	{ id: 'basics', path: '/elo/basics', label: (t) => t.pages.elo.navigation.basics },
	{ id: 'calculation', path: '/elo/calculation', label: (t) => t.pages.elo.navigation.formula },
	{ id: 'fine-print', path: '/elo/fine-print', label: (t) => t.pages.elo.navigation.finePrint },
	{ id: 'calculator', path: '/elo/calculator', label: (t) => t.pages.elo.navigation.calculator }
];

/** Which section a pathname is in; `basics` for anything unrecognised. */
export function activeEloSection(pathname: string): EloSectionId {
	return ELO_SECTIONS.find((s) => pathname.startsWith(s.path))?.id ?? 'basics';
}
