import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerInfoDto } from '$lib/api';
import Calculator from './Calculator.svelte';

const getPlayerInfo = vi.fn();
const getTopActive = vi.fn();

vi.mock('$lib/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api')>();
	return {
		...actual,
		PlayerService: class {
			getPlayerInfo = (...args: unknown[]) => getPlayerInfo(...args);
			searchPlayer = () => Promise.resolve({ status: 200, data: [] });
		},
		fideService: {
			getTopActive: (...args: unknown[]) => getTopActive(...args),
			getPlayerInfo: () => Promise.resolve({ status: 0 }),
			searchPlayers: () => Promise.resolve({ status: 200, data: [] })
		}
	};
});

const ssfPlayer = {
	id: 1,
	firstName: 'Anna',
	lastName: 'Svensson',
	elo: { rating: 2000, rapidRating: 1900, blitzRating: 0, k: 20, rapidk: 40, blitzK: 0 }
} as PlayerInfoDto;

function setup() {
	render(Calculator);
	return userEvent.setup();
}

const ratingFields = () => screen.getAllByRole('spinbutton');

async function enterRatings(
	user: ReturnType<typeof userEvent.setup>,
	white: string,
	black: string
) {
	await user.type(ratingFields()[0], white);
	await user.type(ratingFields()[1], black);
}

const group = (name: string) => within(screen.getByRole('group', { name }));

/** The result card for one side, found by its heading. */
const card = (name: RegExp) => {
	const heading = screen.getByRole('heading', { level: 4, name });
	const container = heading.parentElement;
	if (!container) throw new Error('heading without a card');
	return within(container);
};

describe('Calculator', () => {
	beforeEach(() => {
		getPlayerInfo.mockReset();
		getTopActive.mockReset();
		getTopActive.mockResolvedValue({ status: 200, data: [] });
	});

	it('fetches the top players once for both inputs', () => {
		setup();
		expect(getTopActive).toHaveBeenCalledTimes(1);
		expect(getTopActive).toHaveBeenCalledWith(10);
	});

	it('shows nothing until both sides have a rating', async () => {
		const user = setup();
		expect(screen.queryByRole('heading', { level: 4 })).toBeNull();
		await user.type(ratingFields()[0], '1500');
		expect(screen.queryByRole('heading', { level: 4 })).toBeNull();
	});

	it('works out a game from two typed ratings — the numbers a player checks by hand', async () => {
		// 1500 beats 1600: E = 1/(1+10^(100/400)) = 0.360, ΔR = 20 × 0.640 = 12.8.
		const user = setup();
		await enterRatings(user, '1500', '1600');

		const white = card(/^Vit/);
		expect(white.getByText(/Förväntat resultat/).parentElement).toHaveTextContent('36.0%');
		expect(white.getByText('+12.8')).toBeInTheDocument();
		expect(white.getByText(/Ny rating/).parentElement).toHaveTextContent('1513');
		// A win is a performance of the opponent's rating + 800.
		expect(white.getByText(/Prestation/).parentElement).toHaveTextContent('2400');
		expect(white.getByText('K = 20')).toBeInTheDocument();

		const black = card(/^Svart/);
		expect(black.getByText(/Förväntat resultat/).parentElement).toHaveTextContent('64.0%');
		expect(black.getByText('-12.8')).toBeInTheDocument();
		expect(black.getByText(/Ny rating/).parentElement).toHaveTextContent('1587');
	});

	it('follows the result', async () => {
		const user = setup();
		await enterRatings(user, '1500', '1600');
		await user.click(group('Resultat').getByRole('button', { name: 'Remi' }));
		expect(card(/^Vit/).getByText('+2.8')).toBeInTheDocument();

		await user.click(group('Resultat').getByRole('button', { name: 'Svart vinner' }));
		expect(card(/^Vit/).getByText('-7.2')).toBeInTheDocument();
	});

	it('estimates K from the rating: 10 from 2400 up', async () => {
		const user = setup();
		await enterRatings(user, '2450', '2450');
		expect(card(/^Vit/).getByText('K = 10')).toBeInTheDocument();
	});

	it('takes a manual K per side', async () => {
		const user = setup();
		await enterRatings(user, '1500', '1600');
		await user.click(group('K-faktor').getByRole('button', { name: 'Manuell' }));
		expect(screen.queryByText(/Använder SSF-spelarens K-faktor/)).toBeNull();

		const k1 = screen.getByLabelText('K1');
		await user.clear(k1);
		await user.type(k1, '40');
		expect(card(/^Vit/).getByText('+25.6')).toBeInTheDocument();
		expect(card(/^Svart/).getByText('-12.8')).toBeInTheDocument();
	});

	it('caps the difference at 400 unless told not to, and says when the cap would have applied', async () => {
		const user = setup();
		await enterRatings(user, '2400', '1400');
		const expected = () =>
			card(/^Vit/).getByText(/Förväntat resultat/).parentElement?.textContent ?? '';
		expect(expected()).toContain('90.9%');
		expect(screen.queryByText(/Utan gräns/)).toBeNull();

		await user.click(screen.getByRole('checkbox', { name: 'Ta bort 400-poängsgräns' }));
		expect(expected()).toContain('99.7%');
		expect(
			screen.getByText('Utan gräns — ratingskillnad 1000 (normalt begränsad till 400)')
		).toBeInTheDocument();
	});

	it('does not mention the cap when it would not have applied', async () => {
		const user = setup();
		await enterRatings(user, '1500', '1600');
		await user.click(screen.getByRole('checkbox', { name: 'Ta bort 400-poängsgräns' }));
		expect(screen.queryByText(/Utan gräns/)).toBeNull();
	});

	it('re-derives a looked-up player when the Elo type changes, K from the profile', async () => {
		getPlayerInfo.mockResolvedValue({ status: 200, data: ssfPlayer });
		const user = setup();
		await user.type(ratingFields()[1], '1800');

		const whiteModes = screen.getAllByRole('group', { name: 'Inmatningsläge' })[0];
		await user.click(within(whiteModes).getByRole('button', { name: 'SSF-Id' }));
		await user.type(ratingFields()[0], '1{Enter}');

		const heading = await screen.findByRole('heading', { level: 4, name: /Anna Svensson/ });
		expect(heading).toHaveTextContent('(2000)');
		expect(card(/Anna Svensson/).getByText('K = 20 (profil)')).toBeInTheDocument();

		await user.click(group('Elo-typ').getByRole('button', { name: 'Snabb' }));
		expect(screen.getByRole('heading', { level: 4, name: /Anna Svensson/ })).toHaveTextContent(
			'(1900)'
		);
		expect(card(/Anna Svensson/).getByText('K = 40 (profil)')).toBeInTheDocument();

		// Unrated at blitz: the 1400 default, and K estimated rather than from the profile.
		await user.click(group('Elo-typ').getByRole('button', { name: 'Blixt' }));
		expect(screen.getByRole('heading', { level: 4, name: /Anna Svensson/ })).toHaveTextContent(
			'(1400)'
		);
		expect(card(/Anna Svensson/).getByText('K = 20')).toBeInTheDocument();
	});
});
