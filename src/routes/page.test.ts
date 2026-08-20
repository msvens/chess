import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Page from './+page.svelte';

// Smoke test for the test harness itself: proves a Svelte 5 component compiles,
// mounts into jsdom and is queryable with jest-dom matchers. The Next app could
// not run a test like this at all (vitest was node-only, .ts-only), so keeping
// one is the guard that the harness stays wired up.
describe('home page', () => {
	it('renders the site title', () => {
		render(Page);
		expect(screen.getByRole('heading', { name: 'msvens chess' })).toBeInTheDocument();
	});
});
