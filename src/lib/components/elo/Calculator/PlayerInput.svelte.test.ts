import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MfidePlayer, MfideTopEntry, PlayerInfoDto } from '$lib/api';
import PlayerInput from './PlayerInput.svelte';
import type { LookedUpPlayer, PlayerSelection } from './calculator';

const getPlayerInfo = vi.fn();
const fideGetPlayer = vi.fn();
const loadTopList = vi.fn();
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
			getPlayer: (...args: unknown[]) => fideGetPlayer(...args),
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

const carlsen = {
	fideId: 1503014,
	name: 'Carlsen, Magnus',
	country: 'NOR',
	title: 'GM',
	womenTitle: '',
	birthYear: 1990,
	standard: { rating: 2830, games: 0, k: 10, active: true },
	rapid: { rating: 2820, games: 9, k: 10, active: true },
	blitz: { rating: 2880, games: 21, k: 10, active: true }
} as MfidePlayer;

const carlsenLookedUp: LookedUpPlayer = {
	name: 'GM Carlsen, Magnus (NOR)',
	ratings: { standard: 2830, rapid: 2820, blitz: 2880 },
	kFactors: { standard: 10, rapid: 10, blitz: 10 },
	birthYear: 1990
};

const topPlayer: MfideTopEntry = { ...carlsen, rank: 1 };

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
			loadTopList,
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
		fideGetPlayer.mockReset();
		searchPlayers.mockReset();
		loadTopList.mockReset();
		loadTopList.mockResolvedValue([topPlayer]);
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
		fideGetPlayer.mockResolvedValue({ status: 200, data: carlsen });
		const { onChange, user } = setup();
		await user.click(modeTab('FIDE-Id'));
		await user.type(screen.getByRole('spinbutton'), '1503014{Enter}');

		expect(fideGetPlayer).toHaveBeenCalledWith(1503014);
		expect(onChange).toHaveBeenLastCalledWith({ manualRating: '', lookedUp: carlsenLookedUp });
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

	it('picking a FIDE search hit reports the player in full, with no second request', async () => {
		searchPlayers.mockResolvedValue({ status: 200, data: [carlsen] });
		const { onChange, user } = setup();
		await user.click(modeTab('FIDE-sök'));
		await user.type(screen.getByRole('textbox'), 'Carlsen{Enter}');
		await user.click(await screen.findByRole('button', { name: /Carlsen, Magnus/ }));

		expect(onChange).toHaveBeenLastCalledWith({ manualRating: '', lookedUp: carlsenLookedUp });
		expect(fideGetPlayer).not.toHaveBeenCalled();
	});

	it('opens the open top list for the Elo type, and picks a player in full', async () => {
		const { onChange, user } = setup();
		await user.click(modeTab('Toppspelare'));
		expect(loadTopList).toHaveBeenCalledWith('open', 'standard');

		await user.selectOptions(await screen.findByRole('combobox'), '1503014');
		expect(onChange).toHaveBeenLastCalledWith({ manualRating: '', lookedUp: carlsenLookedUp });
		expect(fideGetPlayer).not.toHaveBeenCalled();
	});

	it('lists the rating of the Elo type on show', async () => {
		const { user } = setup({}, { eloType: 'blitz' });
		await user.click(modeTab('Toppspelare'));
		expect(loadTopList).toHaveBeenCalledWith('open', 'blitz');
		expect(
			await screen.findByRole('option', { name: 'GM Carlsen, Magnus (NOR) — 2880' })
		).toBeInTheDocument();
	});

	it('switches between the four lists', async () => {
		const { user } = setup();
		await user.click(modeTab('Toppspelare'));
		const lists = within(screen.getByRole('group', { name: 'Topplista' }));
		expect(lists.getAllByRole('button').map((b) => b.textContent?.trim())).toEqual([
			'Öppen',
			'Damer',
			'Juniorer',
			'Flickor'
		]);

		await user.click(lists.getByRole('button', { name: 'Flickor' }));
		expect(loadTopList).toHaveBeenLastCalledWith('girls', 'standard');
	});

	it('drops a list that arrives after another was asked for', async () => {
		const slow = deferred<MfideTopEntry[]>();
		loadTopList.mockReturnValueOnce(slow.promise).mockResolvedValueOnce([]);
		const { user } = setup();
		await user.click(modeTab('Toppspelare'));
		await user.click(
			within(screen.getByRole('group', { name: 'Topplista' })).getByRole('button', {
				name: 'Damer'
			})
		);
		await vi.waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument());

		slow.resolve([topPlayer]);
		await slow.promise;
		await new Promise((r) => setTimeout(r, 0));
		expect(screen.queryByRole('option', { name: /Carlsen/ })).toBeNull();
	});

	it('says the top list is loading', async () => {
		loadTopList.mockReturnValue(new Promise(() => {}));
		const { user } = setup();
		await user.click(modeTab('Toppspelare'));
		expect(screen.getByText('Laddar toppspelare...')).toBeInTheDocument();
		expect(screen.queryByRole('combobox')).toBeNull();
	});
});
