import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Toggle from './Toggle.svelte';

describe('Toggle', () => {
	it('exposes a real checkbox with the label as its name', () => {
		render(Toggle, { props: { checked: false, onChange: vi.fn(), label: 'Visa skolklubbar' } });
		expect(screen.getByRole('checkbox', { name: 'Visa skolklubbar' })).toBeInTheDocument();
	});

	it('reflects the checked prop', () => {
		render(Toggle, { props: { checked: true, onChange: vi.fn(), label: 'On' } });
		expect(screen.getByRole('checkbox')).toBeChecked();
	});

	it('reports the new value on click', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(Toggle, { props: { checked: false, onChange, label: 'Visa skolklubbar' } });
		await user.click(screen.getByRole('checkbox'));
		expect(onChange).toHaveBeenCalledWith(true);
	});

	it('is operable by keyboard, which is why it is a checkbox and not a div', async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(Toggle, { props: { checked: false, onChange, label: 'Visa skolklubbar' } });
		await user.tab();
		await user.keyboard(' ');
		expect(onChange).toHaveBeenCalledWith(true);
	});
});
