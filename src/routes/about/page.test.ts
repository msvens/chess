import { render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { language } from '$lib/stores/language.svelte';
import { theme } from '$lib/stores/theme.svelte';
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

	it('has the new sections in both languages', async () => {
		render(About);
		for (const name of ['Vem står bakom?', 'Teknik', 'Andra projekt']) {
			expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
		}

		language.set('en');
		await tick();
		for (const name of ["Who's Behind It", 'Technical Details', 'Other Projects']) {
			expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
		}
	});

	it('names the author, the code and the other projects', () => {
		render(About);
		expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
			'href',
			'https://linkedin.com/in/msvens'
		);
		expect(screen.getByRole('link', { name: 'msvens/chess' })).toHaveAttribute(
			'href',
			'https://github.com/msvens/chess'
		);
		for (const name of [
			'Mellowtech Photos',
			'CV',
			'SK Rockaden',
			'rockaden-wp',
			'chess-wp-plugin'
		]) {
			expect(screen.getByRole('link', { name })).toBeInTheDocument();
		}
	});

	it('shows the logo for the current theme', async () => {
		theme.set('dark');
		render(About);
		expect(screen.getByRole('img', { name: 'msvens chess' })).toHaveAttribute(
			'src',
			'/logo-large-dark.png'
		);
		theme.set('light');
		await tick();
		expect(screen.getByRole('img', { name: 'msvens chess' })).toHaveAttribute(
			'src',
			'/logo-large-light.png'
		);
	});

	it('links out to the federation sites', () => {
		render(About);
		expect(screen.getByRole('link', { name: 'resultat.schack.se' })).toHaveAttribute(
			'href',
			'https://resultat.schack.se/'
		);
	});
});
