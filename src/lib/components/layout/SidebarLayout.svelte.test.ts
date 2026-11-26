import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import SidebarLayout from './SidebarLayout.svelte';

const snippet = (text: string) => createRawSnippet(() => ({ render: () => `<p>${text}</p>` }));

describe('SidebarLayout', () => {
	it('shows the column from the breakpoint up and the narrow version below it', () => {
		render(SidebarLayout, {
			breakpoint: 'lg',
			sidebar: snippet('Column'),
			narrow: snippet('Dropdown'),
			children: snippet('Content')
		});
		expect(screen.getByText('Column').closest('nav')).toHaveClass('hidden', 'lg:block');
		expect(screen.getByText('Dropdown').parentElement).toHaveClass('lg:hidden');
		expect(screen.getByText('Content')).toBeInTheDocument();
	});

	it('switches at md by default', () => {
		render(SidebarLayout, {
			sidebar: snippet('Column'),
			narrow: snippet('Dropdown'),
			children: snippet('Content')
		});
		expect(screen.getByText('Column').closest('nav')).toHaveClass('md:block');
		expect(screen.getByText('Dropdown').parentElement).toHaveClass('md:hidden');
	});

	it('leaves the column out entirely when there is no navigation', () => {
		render(SidebarLayout, { children: snippet('Content') });
		expect(screen.queryByRole('navigation')).toBeNull();
	});
});
