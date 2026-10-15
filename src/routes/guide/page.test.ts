import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet, tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { language } from '$lib/stores/language.svelte';
import Layout from './+layout.svelte';
import { load } from './+page';
import Formats from './formats/+page.svelte';

const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => goto(...args) }));

/** The page the layout is showing; it decides which sidebar entry is current. */
const current = vi.hoisted(() => ({ url: new URL('http://localhost/guide/formats') }));
vi.mock('$app/state', () => ({ page: current }));

/** The layout renders whatever page is inside it; the content is beside the point. */
const children = createRawSnippet(() => ({ render: () => '<p>formats</p>' }));

describe('/guide', () => {
	it('redirects to tournament formats, the first page', () => {
		// `redirect` throws, which is how SvelteKit signals one from a load.
		expect(() => load()).toThrow();
		try {
			load();
		} catch (error) {
			expect(error).toMatchObject({ status: 307, location: '/guide/formats' });
		}
	});
});

describe('the guide section layout', () => {
	it('names the section in both the sidebar and the mobile dropdown, around the page', () => {
		render(Layout, { props: { children } });
		// Both are always in the DOM; the breakpoint decides which one is seen.
		expect(screen.getAllByText('Turneringsformat').length).toBeGreaterThan(1);
		expect(screen.getByText('formats')).toBeInTheDocument();
	});

	it('lists tournament formats, then the Elo pages under their own heading', () => {
		render(Layout, { props: { children } });
		// Two lists (sidebar and dropdown), each with one Elo group of four pages.
		const groups = screen.getAllByRole('group', { name: 'Elo' });
		expect(groups.length).toBeGreaterThan(0);
		const pages = within(groups[0])
			.getAllByRole('option')
			.map((option) => option.textContent?.trim());
		expect(pages).toEqual(['Grunder', 'Formeln', 'Detaljerna', 'Kalkylator']);
	});

	it('marks the page being shown', () => {
		current.url = new URL('http://localhost/guide/elo/formula');
		render(Layout, { props: { children } });
		const selected = screen.getAllByRole('option', { selected: true });
		expect(selected.length).toBeGreaterThan(0);
		expect(selected.every((option) => option.textContent?.trim() === 'Formeln')).toBe(true);
		current.url = new URL('http://localhost/guide/formats');
	});

	it.each([
		['Turneringsformat', '/guide/formats'],
		['Formeln', '/guide/elo/formula'],
		['Kalkylator', '/guide/elo/calculator']
	])('navigates to %s when it is picked', async (label, path) => {
		render(Layout, { props: { children } });
		goto.mockReset();

		await userEvent.setup().click(screen.getAllByRole('option', { name: label }).at(-1)!);

		expect(goto).toHaveBeenCalledWith(path);
	});
});

describe('/guide/formats', () => {
	afterEach(() => language.set('sv'));

	it('renders in the current language', async () => {
		render(Formats);
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Turneringsformat');
		expect(
			screen.getByRole('heading', { level: 2, name: 'Varför olika format?' })
		).toBeInTheDocument();

		language.set('en');
		await tick();
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tournament Formats');
		expect(
			screen.getByRole('heading', { level: 2, name: 'Why Different Formats?' })
		).toBeInTheDocument();
	});

	it('carries the tiebreak table', () => {
		render(Formats);
		expect(screen.getByRole('cell', { name: 'Buchholz' })).toBeInTheDocument();
		expect(screen.getAllByRole('row')).toHaveLength(5);
	});
});
