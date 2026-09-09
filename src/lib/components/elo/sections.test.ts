import { describe, expect, it } from 'vitest';
import { ELO_SECTIONS, activeEloSection } from './sections';

describe('activeEloSection', () => {
	it('matches each section by its path', () => {
		for (const section of ELO_SECTIONS) {
			expect(activeEloSection(section.path)).toBe(section.id);
		}
	});

	it('matches with a trailing slash or deeper path', () => {
		expect(activeEloSection('/elo/calculator/')).toBe('calculator');
	});

	it('falls back to basics for the bare section root', () => {
		expect(activeEloSection('/elo')).toBe('basics');
	});
});
