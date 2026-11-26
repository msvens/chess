import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TextFieldWithButton from './TextFieldWithButton.svelte';

function setup(over: Record<string, unknown> = {}) {
	const onSubmit = vi.fn();
	const onChange = vi.fn();
	render(TextFieldWithButton, {
		props: {
			value: '7457',
			onChange,
			onSubmit,
			buttonLabel: 'Sök',
			label: 'Medlemsnummer',
			...over
		}
	});
	return { onSubmit, onChange, user: userEvent.setup() };
}

describe('TextFieldWithButton', () => {
	it('names the field by its label', () => {
		setup();
		expect(screen.getByLabelText('Medlemsnummer')).toHaveValue('7457');
	});

	it('submits from the button and from Enter alike', async () => {
		const { onSubmit, user } = setup();
		await user.click(screen.getByRole('button', { name: 'Sök' }));
		await user.type(screen.getByLabelText('Medlemsnummer'), '{Enter}');
		expect(onSubmit).toHaveBeenCalledTimes(2);
	});

	it.each([false, true])(
		'gives field and button the same text and padding (compact: %s)',
		(compact) => {
			setup({ compact });
			const field = screen.getByLabelText('Medlemsnummer');
			const button = screen.getByRole('button', { name: 'Sök' });
			for (const cls of ['text-xs', 'md:text-sm', compact ? 'py-1.5' : 'py-2']) {
				expect(field).toHaveClass(cls);
				expect(button).toHaveClass(cls);
			}
		}
	);

	it('can disable the button', () => {
		setup({ buttonDisabled: true });
		expect(screen.getByRole('button', { name: 'Sök' })).toBeDisabled();
	});
});
