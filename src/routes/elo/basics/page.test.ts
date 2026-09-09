import { render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { language } from '$lib/stores/language.svelte';
import Basics from './+page.svelte';
import Calculation from '../calculation/+page.svelte';
import FinePrint from '../fine-print/+page.svelte';

/**
 * The three explanation pages are prose components per language; what is
 * worth checking is that each route picks the right one and titles it.
 */
describe('the Elo explanation pages', () => {
	afterEach(() => language.set('sv'));

	it.each([
		[Basics, 'Elo-grunder', 'Varför rating finns', 'Elo Basics', 'Why Ratings Exist'],
		[Calculation, 'Formeln', 'Förväntat resultat', 'The Formula', 'Expected Score'],
		[FinePrint, 'Detaljerna', 'Att få sin första rating', 'Fine Print', 'Getting Your First Rating']
	])('renders %o in the current language', async (Page, svTitle, svHeading, enTitle, enHeading) => {
		render(Page);
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(svTitle);
		expect(screen.getByRole('heading', { level: 2, name: svHeading })).toBeInTheDocument();

		language.set('en');
		await new Promise((r) => setTimeout(r, 0));
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(enTitle);
		expect(screen.getByRole('heading', { level: 2, name: enHeading })).toBeInTheDocument();
	});

	it('the formula page carries the live expected-score widget', () => {
		render(Calculation);
		expect(
			screen.getByRole('heading', { level: 3, name: 'Testa: Förväntat resultat' })
		).toBeInTheDocument();
	});
});
