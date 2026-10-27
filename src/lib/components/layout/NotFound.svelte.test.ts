import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import NotFound from './NotFound.svelte';

describe('NotFound', () => {
	it('says the page could not be found and links home', () => {
		render(NotFound);
		expect(screen.getByRole('heading', { name: 'Vi kunde inte hitta sidan' })).toBeInTheDocument();
		expect(screen.getByText(/finns inte, eller har flyttats/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Till startsidan' })).toHaveAttribute('href', '/');
	});

	it('takes a page’s own title and a nearer link, without the generic message', () => {
		render(NotFound, {
			props: { title: 'Laget hittades inte', href: '/results/1/2', linkLabel: 'Till ställningen' }
		});
		expect(screen.getByRole('heading', { name: 'Laget hittades inte' })).toBeInTheDocument();
		expect(screen.queryByText(/eller har flyttats/)).toBeNull();
		expect(screen.getByRole('link', { name: 'Till ställningen' })).toHaveAttribute(
			'href',
			'/results/1/2'
		);
	});

	it('shows a message when given one', () => {
		render(NotFound, { props: { title: 'Något gick fel', message: 'Försök igen.' } });
		expect(screen.getByText('Försök igen.')).toBeInTheDocument();
	});
});
