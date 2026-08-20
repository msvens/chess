import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import NavDropdown from './NavDropdown.svelte';
import { moreDropdown } from './nav';

function renderDropdown(onTheme = vi.fn(), onLanguage = vi.fn()) {
	const item = moreDropdown('en', 'dark', onTheme, onLanguage);
	const result = render(NavDropdown, { props: { item, display: 'text' } });
	const toggle = screen.getByRole('button', { name: item.label });
	return { ...result, toggle, onTheme, onLanguage };
}

describe('NavDropdown', () => {
	it('starts collapsed', () => {
		const { toggle } = renderDropdown();
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
	});

	it('opens on click', async () => {
		const user = userEvent.setup();
		const { toggle } = renderDropdown();
		await user.click(toggle);
		expect(toggle).toHaveAttribute('aria-expanded', 'true');
	});

	// The panel stays mounted for the fade/slide, so "closed" is a class state, not
	// absence from the DOM. Assert on aria-expanded, which is the accessible truth.
	it('closes on Escape', async () => {
		const user = userEvent.setup();
		const { toggle } = renderDropdown();
		await user.click(toggle);
		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await user.keyboard('{Escape}');
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
	});

	it('closes on a click outside', async () => {
		const user = userEvent.setup();
		const { toggle } = renderDropdown();
		await user.click(toggle);
		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await user.click(document.body);
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
	});

	it('stays open when clicking inside the panel', async () => {
		const user = userEvent.setup();
		const { toggle } = renderDropdown();
		await user.click(toggle);
		await user.click(screen.getByRole('link', { name: /junior/i }));
		// Navigation is what closes it in the app; the dismissal handlers must not.
		expect(toggle).toHaveAttribute('aria-expanded', 'true');
	});

	it('invokes the theme and language actions', async () => {
		const user = userEvent.setup();
		const { toggle, onTheme, onLanguage } = renderDropdown();
		await user.click(toggle);
		await user.click(screen.getByRole('button', { name: /light mode/i }));
		await user.click(screen.getByRole('button', { name: /svenska/i }));
		expect(onTheme).toHaveBeenCalledOnce();
		expect(onLanguage).toHaveBeenCalledOnce();
	});

	it('renders a divider between the links and the toggles', () => {
		const item = moreDropdown('en', 'dark', vi.fn(), vi.fn());
		const { container } = render(NavDropdown, { props: { item, display: 'text' } });
		expect(container.querySelectorAll('.border-t').length).toBeGreaterThan(0);
	});
});
