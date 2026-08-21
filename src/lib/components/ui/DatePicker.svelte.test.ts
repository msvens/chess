import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DatePicker from './DatePicker.svelte';

function setup(props: Record<string, unknown> = {}) {
	const onChange = vi.fn();
	render(DatePicker, { props: { value: '2026-08-21', onChange, language: 'sv', ...props } });
	return { onChange, user: userEvent.setup() };
}

const trigger = () => screen.getByRole('button', { expanded: false });

describe('DatePicker — date mode', () => {
	it('shows the formatted value on the trigger', () => {
		setup();
		expect(trigger()).toHaveTextContent('2026');
	});

	it('opens a 42-cell grid so the popup height never jumps', async () => {
		const { user } = setup();
		await user.click(trigger());
		// 42 day buttons + 2 navigation buttons + the trigger.
		expect(screen.getAllByRole('button')).toHaveLength(45);
	});

	it('reports the clicked day as YYYY-MM-DD', async () => {
		const { user, onChange } = setup();
		await user.click(trigger());
		await user.click(screen.getByRole('button', { name: '15' }));
		expect(onChange).toHaveBeenCalledWith('2026-08-15');
	});

	it('closes after picking', async () => {
		const { user } = setup();
		await user.click(trigger());
		await user.click(screen.getByRole('button', { name: '15' }));
		expect(trigger()).toHaveAttribute('aria-expanded', 'false');
	});

	it('pages between months', async () => {
		const { user } = setup();
		await user.click(trigger());
		await user.click(screen.getByRole('button', { name: /previous month/i }));
		// July 2026 has 31 days; August also 31 — check the header changed instead.
		expect(screen.getByText(/juli/i)).toBeInTheDocument();
	});

	it('closes on Escape', async () => {
		const { user } = setup();
		await user.click(trigger());
		await user.keyboard('{Escape}');
		expect(trigger()).toHaveAttribute('aria-expanded', 'false');
	});

	it('reopens on the selected value’s month, not wherever you browsed to', async () => {
		const { user } = setup();
		await user.click(trigger());
		await user.click(screen.getByRole('button', { name: /previous month/i }));
		expect(screen.getByText(/juli/i)).toBeInTheDocument();
		await user.keyboard('{Escape}');
		await user.click(trigger());
		expect(screen.getByText(/augusti/i)).toBeInTheDocument();
	});
});

describe('DatePicker — month mode', () => {
	it('offers twelve months and no day grid', async () => {
		const { user } = setup({ mode: 'month', value: '2026-08' });
		await user.click(trigger());
		// 12 months + 2 navigation + trigger.
		expect(screen.getAllByRole('button')).toHaveLength(15);
	});

	it('reports the clicked month as YYYY-MM', async () => {
		const { user, onChange } = setup({ mode: 'month', value: '2026-08' });
		await user.click(trigger());
		await user.click(screen.getByRole('button', { name: /^mar/i }));
		expect(onChange).toHaveBeenCalledWith('2026-03');
	});

	it('pages by year rather than by month', async () => {
		const { user } = setup({ mode: 'month', value: '2026-08' });
		await user.click(trigger());
		expect(screen.getByText('2026')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /previous year/i }));
		expect(screen.getByText('2025')).toBeInTheDocument();
	});
});
