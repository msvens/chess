import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Navbar from './Navbar.svelte';
import { brand, centerItems, rightItems } from './nav';

function renderNavbar(overrides: Partial<Parameters<typeof Navbar>[1]> = {}) {
	return render(Navbar, {
		props: {
			brand,
			display: 'text',
			centerItems: centerItems('sv'),
			rightItems: rightItems('sv', 'dark', vi.fn(), vi.fn()),
			...overrides
		}
	});
}

describe('Navbar', () => {
	it('renders the brand as stacked lines linking home', () => {
		renderNavbar();
		// Two brand marks are in the DOM at once — the desktop grid and the mobile
		// row are shown/hidden by breakpoint classes, not by {#if}.
		const homeLinks = screen.getAllByRole('link', { name: 'msvens chess' });
		expect(homeLinks).toHaveLength(2);
		expect(homeLinks[0]).toHaveAttribute('href', '/');
		// The lines stay separate elements so they stack visually...
		expect(within(homeLinks[0]).getByText('msvens')).toBeInTheDocument();
		expect(within(homeLinks[0]).getByText('chess')).toBeInTheDocument();
		// ...but the accessible name must not run them together. Two inline spans
		// concatenate to "msvenschess" without the explicit label.
		expect(homeLinks[0]).toHaveAccessibleName('msvens chess');
	});

	it('renders every primary section', () => {
		renderNavbar();
		for (const item of centerItems('sv')) {
			expect(
				screen.getAllByRole('link', { name: new RegExp(item.label, 'i') }).length
			).toBeGreaterThan(0);
		}
	});

	it('exposes a mobile menu button', () => {
		renderNavbar();
		expect(screen.getByRole('button', { name: /^menu$/i })).toBeInTheDocument();
	});
});

describe('Navbar mobile drawer', () => {
	it('starts closed and opens on the menu button', async () => {
		const user = userEvent.setup();
		renderNavbar();
		const button = screen.getByRole('button', { name: /^menu$/i });
		expect(button).toHaveAttribute('aria-expanded', 'false');
		await user.click(button);
		expect(button).toHaveAttribute('aria-expanded', 'true');
	});

	it('flattens the dropdown into the drawer rather than nesting it', async () => {
		const user = userEvent.setup();
		renderNavbar();
		await user.click(screen.getByRole('button', { name: /^menu$/i }));
		// 'junior' and 'guide' live inside the More dropdown on desktop; in the
		// drawer they must appear as ordinary rows.
		expect(screen.getAllByRole('link', { name: /junior/i }).length).toBeGreaterThan(0);
	});
});
