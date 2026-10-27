import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import ErrorPage from './+error.svelte';

const state = vi.hoisted(() => ({ page: { status: 404 } }));
vi.mock('$app/state', () => state);

describe('error page', () => {
	it('says the page could not be found for a 404', () => {
		state.page.status = 404;
		render(ErrorPage);
		expect(screen.getByRole('heading', { name: 'Vi kunde inte hitta sidan' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Till startsidan' })).toBeInTheDocument();
	});

	it('says something went wrong for anything else, never the raw error', () => {
		state.page.status = 500;
		render(ErrorPage);
		expect(screen.getByRole('heading', { name: 'Något gick fel' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Till startsidan' })).toBeInTheDocument();
	});
});
