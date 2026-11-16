import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EstimatedRatingChange } from '$lib/api';
import MonthlyEstimate from './MonthlyEstimate.svelte';

const estimateMonthlyRatingChange = vi.fn();

vi.mock('$lib/api', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api')>()),
	estimateMonthlyRatingChange: (...args: unknown[]) => estimateMonthlyRatingChange(...args)
}));

/** The shape of a junior's real November: one rapid tournament, two of five shown. */
const rapid: EstimatedRatingChange = {
	timeControl: 'rapid',
	rating: 1521,
	k: 40,
	games: 2,
	score: 1,
	expectedScore: 0.77,
	change: 9,
	estimatedRating: 1530,
	gameList: [
		{
			tournamentId: 7271,
			tournamentName: 'Farsta SK JGP 2026',
			groupId: 19418,
			roundNr: 2,
			date: '2026-11-08',
			opponentId: 1,
			opponentRating: 1613,
			score: 0,
			expectedScore: 0.37,
			change: -14.8
		},
		{
			tournamentId: 7271,
			tournamentName: 'Farsta SK JGP 2026',
			groupId: 19418,
			roundNr: 4,
			date: '2026-11-08',
			opponentId: 2,
			opponentRating: 1591,
			score: 1,
			expectedScore: 0.4,
			change: 24
		}
	]
};

const respond = (estimates: EstimatedRatingChange[]) =>
	estimateMonthlyRatingChange.mockResolvedValue({
		status: 200,
		data: { memberId: 642062, month: '2026-11', estimates }
	});

const setup = () => {
	render(MonthlyEstimate, { props: { memberId: 642062 } });
	return userEvent.setup();
};

beforeEach(() => estimateMonthlyRatingChange.mockReset());

/** The closed line under the chart: "Uppskattad rating · november" in whatever month the test runs. */
const title = () => screen.getByText(/^Uppskattad rating · /);

describe('the monthly estimate', () => {
	it('starts closed under the chart, and counts nothing until opened', async () => {
		respond([rapid]);
		const user = setup();
		expect(title().closest('details')!.open).toBe(false);
		expect(estimateMonthlyRatingChange).not.toHaveBeenCalled();

		await user.click(title());
		expect(estimateMonthlyRatingChange).toHaveBeenCalledWith(642062);
	});

	it('counts once, however often it is opened', async () => {
		respond([rapid]);
		const user = setup();
		await user.click(title());
		await screen.findByText('Snabb Elo');
		await user.click(title());
		await user.click(title());
		expect(estimateMonthlyRatingChange).toHaveBeenCalledTimes(1);
	});

	it('says it is counting while the games load', async () => {
		let finish!: (value: unknown) => void;
		estimateMonthlyRatingChange.mockReturnValue(new Promise((resolve) => (finish = resolve)));
		const user = setup();
		await user.click(title());
		expect(screen.getByText(/^Räknar /)).toBeInTheDocument();
		finish({ status: 200, data: { memberId: 642062, month: '2026-11', estimates: [] } });
		await vi.waitFor(() => expect(screen.queryByText(/^Räknar /)).toBeNull());
	});

	it('shows a line per time control: rating, estimate and change', async () => {
		respond([rapid]);
		const user = setup();
		await user.click(title());
		const summary = (await screen.findByText('Snabb Elo')).closest('summary')!;
		expect(summary).toHaveTextContent('1521 → ~1530');
		expect(summary).toHaveTextContent('+9');
		expect(summary).not.toHaveTextContent('parti');
	});

	it('opens a line to the groups played, each with its score and points', async () => {
		respond([rapid]);
		const user = setup();
		await user.click(title());
		const summary = (await screen.findByText('Snabb Elo')).closest('summary')!;
		const details = summary.closest('details')!;
		expect(details.open).toBe(false);

		await user.click(summary);
		expect(details.open).toBe(true);
		// Both games are in one group, so they are one line, linking to the player's games there.
		expect(
			within(details).getByRole('link', { name: 'Farsta SK JGP 2026 · 8 nov' })
		).toHaveAttribute('href', '/results/7271/19418/642062');
		expect(details).toHaveTextContent('1 av 2');
		// −14.8 + 24.0, rounded.
		expect(details).toHaveTextContent('+9');
		// Results, not a lesson in the formula.
		expect(details).not.toHaveTextContent('förväntat');
		expect(details).not.toHaveTextContent('K 40');
	});

	it('says under the lines that FIDE publishes the rating monthly', async () => {
		respond([rapid]);
		const user = setup();
		await user.click(title());
		expect(await screen.findByText(/publicerar ratingen en gång i månaden/)).toBeInTheDocument();
	});

	it('collects a league’s evenings into one line with their dates', async () => {
		respond([
			{
				...rapid,
				gameList: [
					{ ...rapid.gameList[0], groupId: 1, tournamentName: 'KM', date: '2026-11-03' },
					{ ...rapid.gameList[1], groupId: 1, tournamentName: 'KM', date: '2026-11-10' }
				]
			}
		]);
		const user = setup();
		await user.click(title());
		await user.click(await screen.findByText('Snabb Elo'));
		expect(screen.getByRole('link', { name: 'KM · 3–10 nov' })).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: /^KM/ })).toHaveLength(1);
	});

	it('says so when no game this month counts', async () => {
		respond([]);
		const user = setup();
		await user.click(title());
		expect(await screen.findByText(/^Inga ratade partier i /)).toBeInTheDocument();
	});

	it('says so when the counting fails', async () => {
		estimateMonthlyRatingChange.mockResolvedValue({ status: 500, error: 'boom' });
		const user = setup();
		await user.click(title());
		expect(await screen.findByText(/^Kunde inte räkna /)).toBeInTheDocument();
	});
});
