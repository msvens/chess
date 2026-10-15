import { describe, expect, it } from 'vitest';
import { GUIDE_SECTIONS, activeGuideSection, legacyEloPath } from './sections';

describe('activeGuideSection', () => {
	it('matches each section by its path', () => {
		for (const section of GUIDE_SECTIONS) {
			expect(activeGuideSection(section.path)).toBe(section.id);
		}
	});

	it('matches with a trailing slash or deeper path', () => {
		expect(activeGuideSection('/guide/elo/calculator/')).toBe('elo-calculator');
		expect(activeGuideSection('/guide/elo/formula')).toBe('elo-formula');
	});

	it('falls back to the first page for anything else', () => {
		expect(activeGuideSection('/guide')).toBe('formats');
		expect(activeGuideSection('/guide/elo')).toBe('formats');
	});

	it('puts the four Elo pages under one heading, the formats page under none', () => {
		expect(GUIDE_SECTIONS.map((s) => s.group ?? null)).toEqual([null, 'Elo', 'Elo', 'Elo', 'Elo']);
	});
});

describe('legacyEloPath', () => {
	it.each([
		['basics', '/guide/elo/basics'],
		['calculation', '/guide/elo/formula'],
		['fine-print', '/guide/elo/fine-print'],
		['calculator', '/guide/elo/calculator'],
		['calculator/', '/guide/elo/calculator'],
		['', '/guide/elo/basics'],
		['no-such-page', '/guide/elo/basics']
	])('sends /elo/%s to %s', (rest, path) => {
		expect(legacyEloPath(rest)).toBe(path);
	});
});
