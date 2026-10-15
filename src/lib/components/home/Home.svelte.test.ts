import { render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { language } from '$lib/stores/language.svelte';
import { theme } from '$lib/stores/theme.svelte';
import Home from './Home.svelte';

describe('Home', () => {
	afterEach(() => {
		language.set('sv');
		theme.set('dark');
	});

	it('greets in the current language', async () => {
		render(Home);
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
			'Välkommen till msvens schack'
		);

		language.set('en');
		await tick();
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to msvens chess');
	});

	it('links into the four main sections', () => {
		render(Home);
		const links = screen
			.getAllByRole('link')
			.filter((link) => !link.getAttribute('href')?.startsWith('http'));
		expect(links.map((link) => link.getAttribute('href'))).toEqual([
			'/calendar',
			'/results',
			'/players',
			'/organizations'
		]);
		expect(screen.getByRole('link', { name: /Turneringskalender/ })).toHaveAttribute(
			'href',
			'/calendar'
		);
	});

	it('shows the federation logo that suits the theme', async () => {
		render(Home);
		const logo = screen.getByRole('img', { name: 'Sveriges Schackförbund' });
		expect(logo).toHaveAttribute('src', '/partners/schack-se-dark.png');

		theme.set('light');
		await tick();
		expect(logo).toHaveAttribute('src', '/partners/schack-se-light.png');
	});

	it('opens the partner sites in a new tab', () => {
		render(Home);
		expect(screen.getByRole('link', { name: 'FIDE' })).toHaveAttribute('target', '_blank');
		expect(screen.getByRole('link', { name: 'Sveriges Schackförbund' })).toHaveAttribute(
			'rel',
			'noopener noreferrer'
		);
	});

	it('leaves the language and theme switches to the top bar', () => {
		render(Home);
		expect(screen.queryByRole('button')).toBeNull();
	});
});
