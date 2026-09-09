import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FideActivePlayer, FidePlayerInfo, PlayerInfoDto } from '$lib/api';
import PlayerInput from './PlayerInput.svelte';
import type { LookedUpPlayer, PlayerSelection } from './calculator';

const getPlayerInfo = vi.fn();
const fideGetPlayerInfo = vi.fn();
const searchPlayers = vi.fn();

vi.mock('$lib/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api')>();
	return {
		...actual,
		PlayerService: class {
			getPlayerInfo = (...args: unknown[]) => getPlayerInfo(...args);
			searchPlayer = () => Promise.resolve({ status: 200, data: [] });
		},
		fideService: {
			getPlayerInfo: (...args: unknown[]) => fideGetPlayerInfo(...args),
			searchPlayers: (...args: unknown[]) => searchPlayers(...args)
		}
	};
});

const ssfPlayer = {
	id: 1,
	firstName: 'Anna',
	lastName: 'Svensson',
	elo: { rating: 2000, rapidRating: 1900, blitzRating: 0, k: 20, rapidk: 40, blitzK: 0 }
} as PlayerInfoDto;

const fideInfo = {
	name: 'Carlsen, Magnus',
	federation: 'Norway',
	fide_title: 'Grandmaster',
	birth_year: 1990,
	history: [{ classical_rating: 2830, rapid_rating: 2820, blitz_rating: 2880 }]
} as FidePlayerInfo;

const topPlayer = {
	fide_id: '1503014',
	name: 'Carlsen, Magnus',
	country: 'NOR',
	rating: '2830'
} as FideActivePlayer;

const lookedUp: LookedUpPlayer = {
	name: 'Anna Svensson',
	ratings: { standard: 2000, rapid: 1900, blitz: 0 },
	kFactors: { standard: 20, rapid: 40, blitz: null },
	birthYear: null
};

function setup(over: Partial<PlayerSelection> = {}, props: Record<string, unknown> = {}) {
	const onChange = vi.fn();
	render(PlayerInput, {
		props: {
			label: 'Vit',
			eloType: 'standard',
			selection: { manualRating: '', lookedUp: null, ...over },
			onChange,
			topPlayers: [topPlayer],
			topPlayersLoading: false,
			...props
		}
	});
	return { onChange, user: userEvent.setup() };
}

const modeTab = (name: string) =>
	within(screen.getByRole('group', { name: 'Inmatningsläge' })).getByRole('button', { name });

/** A promise the test resolves by hand, to order a response after a user action. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
}

describe('PlayerInput', () => {
	beforeEach(() => {
		getPlayerInfo.mockReset();
		fideGetPlayerInfo.mockReset();
		searchPlayers.mockReset();
	});

	it('starts in manual mode and reports what is typed as a manual rating', async () => {
		const { onChange, user } = setup();
		await user.type(screen.getByRole('spinbutton'), '1');
		expect(onChange).toHaveBeenLastCalledWith({ manualRating: '1', lookedUp: null });
	});

	it('looks up an SSF id and reports the player with their per-type ratings and Ks', async () => {
		getPlayerInfo.mockResolvedValue({ status: 200, data: ssfPlayer });
		const { onChange, user } = setup();
		await user.click(modeTab('SSF-Id'));
		await user.type(screen.getByRole('spinbutton'), '1{Enter}');

		expect(getPlayerInfo).toHaveBeenCalledWith(1);
		expect(onChange).toHaveBeenLastCalledWith({ manualRating: '', lookedUp });
	});

	it('says so when the id does not resolve', async () => {
		getPlayerInfo.mockResolvedValue({ status: 404 });
		const { user } = setup();
		await user.click(modeTab('SSF-Id'));
		await user.type(screen.getByRole('spinbutton'), '1');
		await user.click(screen.getByRole('button', { name: 'Sök' }));
		expect(await screen.findByText('Spelare hittades inte')).toBeInTheDocument();
	});

	it('looks up a FIDE id, with the birth year the junior rule needs', async () => {
		fideGetPlayerInfo.mockResolvedValue({ status: 200, data: fideInfo });
		const { onChange, user } = setup();
		await user.click(modeTab('FIDE-Id'));
		await user.type(screen.getByRole('spinbutton'), '1503014{Enter}');

		expect(fideGetPlayerInfo).toHaveBeenCalledWith(1503014, true);
		expect(onChange).toHaveBeenLastCalledWith({
			manualRating: '',
			lookedUp: {
				name: 'GM Carlsen, Magnus (NOR)',
				ratings: { standard: 2830, rapid: 2820, blitz: 2880 },
				kFactors: null,
				birthYear: 1990
			}
		});
	});

	it('shows the looked-up name and the rating for the chosen Elo type with its K', () => {
		setup({ lookedUp }, { eloType: 'rapid' });
		expect(screen.getByText('Anna Svensson')).toBeInTheDocument();
		// The rating line lives under the lookup modes, not the manual field.
		expect(screen.queryByText(/Rating: 1900/)).toBeNull();
	});

	it('under a lookup mode, the rating line follows the Elo type', async () => {
		const { user } = setup({ lookedUp }, { eloType: 'rapid' });
		await user.click(modeTab('SSF-sök'));
		// Clicking the tab dropped the lookup in the parent's eyes (onChange), but
		// this render still holds the prop, which is what the line reads from.
		expect(screen.getByText('Rating: 1900 (K=40)')).toBeInTheDocument();
	});

	it('flags a default rating when the player is unrated for that type', () => {
		setup({ lookedUp }, { eloType: 'blitz' });
		expect(screen.getByText(/använder standardrating 1400/)).toBeInTheDocument();
	});

	it('switching mode carries the rating on show into the manual field and drops the lookup', async () => {
		// The lookup's K and, above all, its birth year must not outlive the
		// mode — in the Next app a FIDE junior's birth year survived into manual
		// input and gave a typed rating K=40.
		const { onChange, user } = setup({ lookedUp }, { eloType: 'rapid' });
		await user.click(modeTab('Manuell'));
		expect(onChange).toHaveBeenLastCalledWith({ manualRating: '1900', lookedUp: null });
	});

	it('switching mode with nothing selected keeps the typed rating', async () => {
		const { onChange, user } = setup({ manualRating: '1850' });
		await user.click(modeTab('FIDE-Id'));
		expect(onChange).toHaveBeenLastCalledWith({ manualRating: '1850', lookedUp: null });
	});

	it('picking a top player shows the row at once, then the full profile', async () => {
		fideGetPlayerInfo.mockResolvedValue({ status: 200, data: fideInfo });
		const { onChange, user } = setup();
		await user.click(modeTab('Toppspelare'));
		await user.selectOptions(screen.getByRole('combobox'), '1503014');

		expect(onChange).toHaveBeenNthCalledWith(2, {
			manualRating: '',
			lookedUp: {
				name: 'Carlsen, Magnus (NOR)',
				ratings: { standard: 2830, rapid: 0, blitz: 0 },
				kFactors: null,
				birthYear: null
			}
		});
		expect(fideGetPlayerInfo).toHaveBeenCalledWith(1503014, true);
		await vi.waitFor(() =>
			expect(onChange).toHaveBeenLastCalledWith({
				manualRating: '',
				lookedUp: expect.objectContaining({ name: 'GM Carlsen, Magnus (NOR)', birthYear: 1990 })
			})
		);
	});

	it('drops a profile that arrives after the user has moved on', async () => {
		const profile = deferred<{ status: number; data: FidePlayerInfo }>();
		fideGetPlayerInfo.mockReturnValue(profile.promise);
		const { onChange, user } = setup();
		await user.click(modeTab('Toppspelare'));
		await user.selectOptions(screen.getByRole('combobox'), '1503014');
		await user.click(modeTab('Manuell'));
		const callsBefore = onChange.mock.calls.length;

		profile.resolve({ status: 200, data: fideInfo });
		await profile.promise;
		await new Promise((r) => setTimeout(r, 0));
		expect(onChange.mock.calls.length).toBe(callsBefore);
	});

	it('keeps the row data, without an error, when the profile fails', async () => {
		fideGetPlayerInfo.mockResolvedValue({ status: 0 });
		const { onChange, user } = setup();
		await user.click(modeTab('Toppspelare'));
		await user.selectOptions(screen.getByRole('combobox'), '1503014');
		await vi.waitFor(() => expect(screen.queryByText('Söker...')).toBeNull());

		expect(onChange).toHaveBeenCalledTimes(2);
		expect(screen.queryByText('Spelare hittades inte')).toBeNull();
	});

	it('says the top list is loading', async () => {
		const { user } = setup({}, { topPlayersLoading: true });
		await user.click(modeTab('Toppspelare'));
		expect(screen.getByText('Laddar toppspelare...')).toBeInTheDocument();
		expect(screen.queryByRole('combobox')).toBeNull();
	});
});
