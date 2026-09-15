import { render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { language } from '$lib/stores/language.svelte';
import About from './+page.svelte';

/** Prose components per language; what is worth checking is that the route picks the right one. */
describe('/about', () => {
	afterEach(() => language.set('sv'));

	it('renders in the current language', async () => {
		render(About);
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Om msvens schack');
		expect(screen.getByRole('heading', { level: 2, name: 'Länkar & Tack' })).toBeInTheDocument();

		language.set('en');
		await tick();
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('About msvens chess');
		expect(
			screen.getByRole('heading', { level: 2, name: 'Links & Acknowledgments' })
		).toBeInTheDocument();
	});

	it('links out to the federation sites', () => {
		render(About);
		expect(screen.getByRole('link', { name: 'resultat.schack.se' })).toHaveAttribute(
			'href',
			'https://resultat.schack.se/'
		);
	});
});
