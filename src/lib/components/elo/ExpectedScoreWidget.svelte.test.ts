import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ExpectedScoreWidget from './ExpectedScoreWidget.svelte';

describe('ExpectedScoreWidget', () => {
	it('starts at 1500 v 1500: an even game', () => {
		render(ExpectedScoreWidget);
		expect(screen.getByLabelText('Din rating')).toHaveValue(1500);
		expect(screen.getByText(/Ditt förväntade resultat/).parentElement).toHaveTextContent('50.0%');
		expect(screen.getByText(/Ratingskillnad/)).toHaveTextContent('Ratingskillnad: 0 poäng');
	});

	it('recomputes both sides as the ratings change', async () => {
		render(ExpectedScoreWidget);
		const user = userEvent.setup();
		const opponent = screen.getByLabelText('Motståndarens rating');
		await user.clear(opponent);
		await user.type(opponent, '1600');

		expect(screen.getByText(/Ditt förväntade resultat/).parentElement).toHaveTextContent('36.0%');
		expect(screen.getByText(/Motståndarens förväntade/).parentElement).toHaveTextContent('64.0%');
		expect(screen.getByText(/Ratingskillnad/)).toHaveTextContent('100 poäng');
		expect(screen.getByText(/Ratingskillnad/)).not.toHaveTextContent('begränsad');
	});

	it('says when the 400-point cap applied', async () => {
		render(ExpectedScoreWidget);
		const user = userEvent.setup();
		const opponent = screen.getByLabelText('Motståndarens rating');
		await user.clear(opponent);
		await user.type(opponent, '2500');

		expect(screen.getByText(/Ditt förväntade resultat/).parentElement).toHaveTextContent('9.1%');
		expect(screen.getByText(/Ratingskillnad/)).toHaveTextContent(
			'Ratingskillnad: 1000 poäng (begränsad till 400)'
		);
	});

	it('shows nothing while a field is empty', async () => {
		render(ExpectedScoreWidget);
		const user = userEvent.setup();
		await user.clear(screen.getByLabelText('Din rating'));
		expect(screen.queryByText(/Ditt förväntade resultat/)).toBeNull();
	});
});
