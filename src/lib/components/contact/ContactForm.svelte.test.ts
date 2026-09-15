import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ContactForm from './ContactForm.svelte';

const ENDPOINT = 'https://formspree.io/f/test';

async function fillAndSend() {
	const user = userEvent.setup();
	await user.type(screen.getByLabelText('Din e-post'), 'a@example.com');
	await user.type(screen.getByLabelText('Meddelande'), 'Hej');
	await user.click(screen.getByRole('button', { name: 'Skicka feedback' }));
}

describe('ContactForm', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('shows a placeholder instead of a form when no endpoint is configured', () => {
		render(ContactForm, { props: { endpoint: undefined } });
		expect(screen.getByText('Under uppbyggnad. Titta in snart igen!')).toBeInTheDocument();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('posts the email and message as JSON, then thanks the sender', async () => {
		const fetch = vi.fn().mockResolvedValue({ ok: true });
		vi.stubGlobal('fetch', fetch);
		render(ContactForm, { props: { endpoint: ENDPOINT } });

		await fillAndSend();

		expect(fetch).toHaveBeenCalledWith(ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: 'a@example.com', message: 'Hej' })
		});
		expect(
			await screen.findByText('Tack för din feedback! Vi återkommer om det behövs.')
		).toBeInTheDocument();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('disables the form while sending', async () => {
		vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
		render(ContactForm, { props: { endpoint: ENDPOINT } });

		await fillAndSend();

		expect(screen.getByRole('button', { name: 'Skickar...' })).toBeDisabled();
		expect(screen.getByLabelText('Din e-post')).toBeDisabled();
		expect(screen.getByLabelText('Meddelande')).toBeDisabled();
	});

	it.each([
		['a rejected response', () => vi.fn().mockResolvedValue({ ok: false })],
		['a network failure', () => vi.fn().mockRejectedValue(new TypeError('offline'))]
	])('reports %s and keeps what was typed', async (_, makeFetch) => {
		vi.stubGlobal('fetch', makeFetch());
		render(ContactForm, { props: { endpoint: ENDPOINT } });

		await fillAndSend();

		expect(await screen.findByText('Något gick fel. Försök igen senare.')).toBeInTheDocument();
		expect(screen.getByLabelText('Din e-post')).toHaveValue('a@example.com');
		expect(screen.getByLabelText('Meddelande')).toHaveValue('Hej');
		expect(screen.getByRole('button', { name: 'Skicka feedback' })).toBeEnabled();
	});
});
