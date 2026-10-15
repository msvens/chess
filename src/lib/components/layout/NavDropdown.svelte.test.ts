import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import NavDropdown from './NavDropdown.svelte';
import { moreDropdown } from './nav';
import type { NavDropdownItem } from './navTypes';

function renderDropdown() {
	const item = moreDropdown('en');
	const result = render(NavDropdown, { props: { item, display: 'text' } });
	const toggle = screen.getByRole('button', { name: item.label });
	return { ...result, toggle };
}

/** A dropdown with an action and a divider — kinds More itself no longer uses. */
const withAction = (onClick: () => void): NavDropdownItem => ({
	kind: 'dropdown',
	id: 'tools',
	label: 'Tools',
	items: [
		{ kind: 'link', id: 'guide', href: '/guide', label: 'Guide' },
		{ kind: 'divider' },
		{ kind: 'action', id: 'reset', label: 'Reset', onClick }
	]
});

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

	it('invokes an action item', async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(NavDropdown, { props: { item: withAction(onClick), display: 'text' } });
		await user.click(screen.getByRole('button', { name: 'Tools' }));
		await user.click(screen.getByRole('button', { name: 'Reset' }));
		expect(onClick).toHaveBeenCalledOnce();
	});

	it('renders a divider item', () => {
		const { container } = render(NavDropdown, {
			props: { item: withAction(vi.fn()), display: 'text' }
		});
		expect(container.querySelectorAll('.border-t').length).toBeGreaterThan(0);
	});
});
