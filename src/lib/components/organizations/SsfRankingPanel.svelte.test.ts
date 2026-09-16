import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerInfoDto } from '$lib/api';
import SsfRankingPanel from './SsfRankingPanel.svelte';

const getFederationRatingList = vi.fn();
vi.mock('$lib/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api')>();
	return {
		...actual,
		RatingsService: class {
			getFederationRatingList = (...args: unknown[]) => getFederationRatingList(...args);
		}
	};
});
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const player = (id: number, lastName: string, rating: number) =>
	({ id, firstName: 'A', lastName, elo: { rating } }) as PlayerInfoDto;

describe('SsfRankingPanel', () => {
	beforeEach(() => getFederationRatingList.mockReset());

	it('lists the players it fetched', async () => {
		getFederationRatingList.mockResolvedValue({ data: [player(1, 'Carlsen', 2830)], status: 200 });
		render(SsfRankingPanel);

		expect(await screen.findByText('Carlsen')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Försök igen' })).not.toBeInTheDocument();
	});

	it('reports a failure instead of an empty table, and offers a retry', async () => {
		// How the SDK reports a timeout: an error, no data, and it never throws.
		getFederationRatingList.mockResolvedValue({
			error: 'Request timed out after 30000ms',
			status: 0
		});
		render(SsfRankingPanel);

		expect(await screen.findByText('Kunde inte hämta ratingen')).toBeInTheDocument();
		expect(screen.queryByText('Inga spelare hittades')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Försök igen' })).toBeInTheDocument();
	});

	it('recovers when the retry succeeds', async () => {
		getFederationRatingList.mockResolvedValueOnce({ error: 'Request timed out', status: 0 });
		render(SsfRankingPanel);
		const retry = await screen.findByRole('button', { name: 'Försök igen' });

		getFederationRatingList.mockResolvedValueOnce({
			data: [player(2, 'Grandelius', 2670)],
			status: 200
		});
		await userEvent.setup().click(retry);

		expect(await screen.findByText('Grandelius')).toBeInTheDocument();
		expect(screen.queryByText('Kunde inte hämta ratingen')).not.toBeInTheDocument();
		expect(getFederationRatingList).toHaveBeenCalledTimes(2);
	});

	it('asks for the standard list of the current rating period', async () => {
		getFederationRatingList.mockResolvedValue({ data: [], status: 200 });
		render(SsfRankingPanel);
		await screen.findByText('Inga spelare hittades');

		const [ratingDate] = getFederationRatingList.mock.calls[0];
		// Rating lists are published monthly, so the panel asks for the 1st.
		expect((ratingDate as Date).getDate()).toBe(1);
	});
});
