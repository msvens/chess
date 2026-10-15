import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { Sun } from 'svelte-hero-icons';
import { afterEach, describe, expect, it, vi } from 'vitest';
import IconButton from './IconButton.svelte';

afterEach(() => {
	vi.useRealTimers();
});

describe('IconButton', () => {
	it('takes its accessible name from the title', () => {
		render(IconButton, { icon: Sun, title: 'Light Mode' });
		expect(screen.getByRole('button', { name: 'Light Mode' })).toBeInTheDocument();
	});

	it('prefers an explicit aria-label', () => {
		render(IconButton, { icon: Sun, title: 'Light Mode', ariaLabel: 'Switch theme' });
		expect(screen.getByRole('button', { name: 'Switch theme' })).toBeInTheDocument();
	});

	it('calls onclick', async () => {
		const onclick = vi.fn();
		render(IconButton, { icon: Sun, title: 'Light Mode', onclick });
		await userEvent.setup().click(screen.getByRole('button'));
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('renders content that is not an icon', () => {
		const children = createRawSnippet(() => ({ render: () => '<span>🇸🇪</span>' }));
		render(IconButton, { title: 'Svenska', children });
		expect(screen.getByRole('button', { name: 'Svenska' })).toHaveTextContent('🇸🇪');
	});

	it('shows the tooltip on hover after the delay, and hides it on leave', async () => {
		vi.useFakeTimers();
		render(IconButton, { icon: Sun, title: 'Light Mode', delay: 500 });
		const button = screen.getByRole('button');

		await fireEvent.mouseEnter(button);
		expect(screen.queryByRole('tooltip')).toBeNull();
		vi.advanceTimersByTime(500);
		await vi.waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('Light Mode'));

		await fireEvent.mouseLeave(button);
		expect(screen.queryByRole('tooltip')).toBeNull();
	});

	it('never shows the tooltip if the pointer leaves first', async () => {
		vi.useFakeTimers();
		render(IconButton, { icon: Sun, title: 'Light Mode', delay: 500 });
		const button = screen.getByRole('button');

		await fireEvent.mouseEnter(button);
		vi.advanceTimersByTime(200);
		await fireEvent.mouseLeave(button);
		vi.advanceTimersByTime(500);
		expect(screen.queryByRole('tooltip')).toBeNull();
	});

	it('shows the tooltip on keyboard focus too', async () => {
		render(IconButton, { icon: Sun, title: 'Light Mode', delay: 0 });
		await fireEvent.focus(screen.getByRole('button'));
		expect(screen.getByRole('tooltip')).toHaveTextContent('Light Mode');
	});
});
