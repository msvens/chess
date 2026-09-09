import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FidePlayer } from '$lib/api';
import FidePlayerSearchInput from './FidePlayerSearchInput.svelte';

const searchPlayers = vi.fn();

vi.mock('$lib/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api')>();
	return {
		...actual,
		fideService: { searchPlayers: (...args: unknown[]) => searchPlayers(...args) }
	};
});

const hit = (over: Partial<FidePlayer>): FidePlayer =>
	({ fideid: '1', name: 'Carlsen, Magnus', country: 'NOR', rating: 2830, ...over }) as FidePlayer;

const ok = (data: FidePlayer[]) => ({ status: 200, data });

function setup(over: Record<string, unknown> = {}) {
	const onSelect = vi.fn();
	render(FidePlayerSearchInput, {
		props: {
			onSelect,
			placeholder: 'Sök på namn...',
			searchLabel: 'Sök',
			noResultsMessage: 'Inga spelare hittades',
			...over
		}
	});
	return { onSelect, user: userEvent.setup() };
}

const type = async (user: ReturnType<typeof userEvent.setup>, text: string) =>
	user.type(screen.getByRole('textbox'), text);

const clickSearch = async (user: ReturnType<typeof userEvent.setup>) =>
	user.click(screen.getByRole('button', { name: 'Sök' }));

describe('FidePlayerSearchInput', () => {
	beforeEach(() => searchPlayers.mockReset());

	it('sends the trimmed query as one string — FIDE search is free text', async () => {
		searchPlayers.mockResolvedValue(ok([]));
		const { user } = setup();
		await type(user, '  Magnus Carlsen  ');
		await clickSearch(user);
		expect(searchPlayers).toHaveBeenCalledWith('Magnus Carlsen');
	});

	it('searches on Enter as well as the button', async () => {
		searchPlayers.mockResolvedValue(ok([]));
		const { user } = setup();
		await type(user, 'Carlsen{Enter}');
		expect(searchPlayers).toHaveBeenCalledWith('Carlsen');
	});

	it('does not search for nothing', async () => {
		const { user } = setup();
		await type(user, '   ');
		expect(screen.getByRole('button', { name: 'Sök' })).toBeDisabled();
		expect(searchPlayers).not.toHaveBeenCalled();
	});

	it('lists the hits with title, country and rating', async () => {
		searchPlayers.mockResolvedValue(
			ok([
				hit({ fideid: '1', title: 'GM' }),
				hit({ fideid: '2', name: 'Carlsen, Anna', w_title: 'WIM', rating: 0 })
			])
		);
		const { user } = setup();
		await type(user, 'Carlsen');
		await clickSearch(user);

		expect(await screen.findByText(/GM Carlsen, Magnus/)).toBeInTheDocument();
		expect(screen.getByText('(NOR • 2830)')).toBeInTheDocument();
		// An unrated hit shows the country alone.
		expect(screen.getByText(/WIM Carlsen, Anna/)).toBeInTheDocument();
		expect(screen.getByText('(NOR)')).toBeInTheDocument();
	});

	it('hands the chosen player back and fills the field with their titled name', async () => {
		searchPlayers.mockResolvedValue(ok([hit({ title: 'GM' })]));
		const { onSelect, user } = setup();
		await type(user, 'Carlsen');
		await clickSearch(user);
		await user.click(await screen.findByRole('button', { name: /Carlsen, Magnus/ }));

		expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ fideid: '1' }));
		expect(screen.getByRole('textbox')).toHaveValue('GM Carlsen, Magnus');
		expect(screen.queryByRole('button', { name: /Carlsen, Magnus/ })).toBeNull();
	});

	it('says so when nobody matches, and the same when the request fails', async () => {
		searchPlayers.mockResolvedValueOnce(ok([])).mockResolvedValueOnce({ status: 0 });
		const { user } = setup();
		await type(user, 'Nobody');
		await clickSearch(user);
		expect(await screen.findByText('Inga spelare hittades')).toBeInTheDocument();

		await clickSearch(user);
		expect(await screen.findByText('Inga spelare hittades')).toBeInTheDocument();
	});

	it('shows the helper text until there is something to say', async () => {
		searchPlayers.mockResolvedValue(ok([]));
		const { user } = setup({ helperText: 'Skriv efternamn' });
		expect(screen.getByText('Skriv efternamn')).toBeInTheDocument();

		await type(user, 'Nobody');
		await clickSearch(user);
		expect(await screen.findByText('Inga spelare hittades')).toBeInTheDocument();
		expect(screen.queryByText('Skriv efternamn')).toBeNull();
	});
});
