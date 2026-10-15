import type { Translations } from '$lib/translations';

export type GuideSectionId =
	'formats' | 'elo-basics' | 'elo-formula' | 'elo-fine-print' | 'elo-calculator';

export interface GuideSection {
	id: GuideSectionId;
	path: string;
	label: (t: Translations) => string;
	/** The heading the page sits under in the sidebar, if any. */
	group?: string;
}

/** "Elo" is the same word in both languages, so the heading is not translated. */
const ELO = 'Elo';

/** The guide's pages, in sidebar order. */
export const GUIDE_SECTIONS: readonly GuideSection[] = [
	{ id: 'formats', path: '/guide/formats', label: (t) => t.pages.guide.navigation.formats },
	{
		id: 'elo-basics',
		path: '/guide/elo/basics',
		label: (t) => t.pages.elo.navigation.basics,
		group: ELO
	},
	{
		id: 'elo-formula',
		path: '/guide/elo/formula',
		label: (t) => t.pages.elo.navigation.formula,
		group: ELO
	},
	{
		id: 'elo-fine-print',
		path: '/guide/elo/fine-print',
		label: (t) => t.pages.elo.navigation.finePrint,
		group: ELO
	},
	{
		id: 'elo-calculator',
		path: '/guide/elo/calculator',
		label: (t) => t.pages.elo.navigation.calculator,
		group: ELO
	}
];

/** Which section a pathname is in; `formats`, the guide's first page, for anything else. */
export function activeGuideSection(pathname: string): GuideSectionId {
	return (
		GUIDE_SECTIONS.find((s) => pathname === s.path || pathname.startsWith(s.path + '/'))?.id ??
		'formats'
	);
}

/**
 * Where an old `/elo/…` address lives now. Elo used to be its own section;
 * bookmarks and links to it keep working. `rest` is what followed `/elo/`.
 */
export function legacyEloPath(rest: string): string {
	const page = rest.replace(/\/+$/, '');
	if (page === 'calculation') return '/guide/elo/formula';
	if (page === 'basics' || page === 'fine-print' || page === 'calculator') {
		return `/guide/elo/${page}`;
	}
	return '/guide/elo/basics';
}
