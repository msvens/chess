import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet, tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { language } from '$lib/stores/language.svelte';
import Layout from './+layout.svelte';
import { load } from './+page';
import Formats from './formats/+page.svelte';

const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => goto(...args) }));

/** The layout renders whatever page is inside it; the content is beside the point. */
const children = createRawSnippet(() => ({ render: () => '<p>formats</p>' }));

describe('/guide', () => {
	it('redirects to tournament formats, the only section', () => {
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

	it('navigates to the formats page when the entry is picked', async () => {
		render(Layout, { props: { children } });
		goto.mockReset();

		await userEvent.setup().click(screen.getByRole('option', { name: 'Turneringsformat' }));

		expect(goto).toHaveBeenCalledWith('/guide/formats');
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
