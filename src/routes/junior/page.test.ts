import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import Layout from './+layout.svelte';
import { load } from './+page';

const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => goto(...args) }));

/** The layout renders whatever page is inside it; the content is beside the point. */
const children = createRawSnippet(() => ({ render: () => '<p>standings</p>' }));

const renderLayout = () => render(Layout, { props: { children } });

describe('/junior', () => {
	it('redirects to the JGP standings, the only section', () => {
		// `redirect` throws, which is how SvelteKit signals one from a load.
		expect(() => load()).toThrow();
		try {
			load();
		} catch (error) {
			expect(error).toMatchObject({ status: 307, location: '/junior/stockholms-jgp' });
		}
	});
});

describe('the junior section layout', () => {
	it('names the section in both the sidebar and the mobile dropdown', () => {
		renderLayout();
		// Both are always in the DOM; the breakpoint decides which one is seen.
		expect(screen.getAllByText('Stockholms JGP').length).toBeGreaterThan(1);
	});

	it('renders the page inside it', () => {
		renderLayout();
		expect(screen.getByText('standings')).toBeInTheDocument();
	});

	it('navigates to the standings when the entry is picked', async () => {
		renderLayout();
		const user = userEvent.setup();
		goto.mockReset();

		// The sidebar's entry, which is present without opening the dropdown.
		await user.click(screen.getByRole('option', { name: 'Stockholms JGP' }));

		expect(goto).toHaveBeenCalledWith('/junior/stockholms-jgp');
	});
});
