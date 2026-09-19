import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { RatingAlgorithm, type TournamentEndResultDto } from '$lib/api';
import RegistrationTable from './RegistrationTable.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const entry = (id: number, lastName: string, rating?: number): TournamentEndResultDto =>
	({
		contenderId: id,
		place: 1000,
		points: 0,
		playerInfo: { id, firstName: 'A', lastName, club: 'SK Test', elo: { rating } }
	}) as TournamentEndResultDto;

// The name column renders `formatPlayerName`, i.e. "first last".
const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row');
const column = (index: number) =>
	bodyRows().map((row) => within(row).getAllByRole('cell')[index].textContent?.trim());

describe('RegistrationTable', () => {
	it('seeds the entry list by rating rather than keeping the API order', () => {
		render(RegistrationTable, {
			props: {
				results: [entry(1, 'Weak', 1200), entry(2, 'Strong', 2400), entry(3, 'Middling', 1800)],
				rankingAlgorithm: RatingAlgorithm.STANDARD_ELO
			}
		});
		expect(column(1)).toEqual(['A Strong', 'A Middling', 'A Weak']);
	});

	it('numbers the rows by seed position, not by where they arrived', () => {
		render(RegistrationTable, {
			props: {
				results: [entry(1, 'Weak', 1200), entry(2, 'Strong', 2400)],
				rankingAlgorithm: RatingAlgorithm.STANDARD_ELO
			}
		});
		expect(column(0)).toEqual(['1', '2']);
		// Seed 1 is the higher-rated player, whichever order the API sent them in.
		expect(column(1)).toEqual(['A Strong', 'A Weak']);
	});

	it('puts unrated entries last', () => {
		render(RegistrationTable, {
			props: {
				results: [entry(1, 'Unrated'), entry(2, 'Rated', 1500)],
				rankingAlgorithm: RatingAlgorithm.STANDARD_ELO
			}
		});
		expect(column(1)).toEqual(['A Rated', 'A Unrated']);
	});

	it('never shows the no-placement sentinel', () => {
		render(RegistrationTable, {
			props: {
				results: [entry(1, 'Someone', 1500)],
				rankingAlgorithm: RatingAlgorithm.STANDARD_ELO
			}
		});
		expect(screen.queryByText('1000')).not.toBeInTheDocument();
	});
});
