import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerInfoDto } from '$lib/api';
import PlayerSearchInput from './PlayerSearchInput.svelte';

const searchPlayer = vi.fn();

vi.mock('$lib/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api')>();
	return {
		...actual,
		PlayerService: class {
			searchPlayer = (...args: unknown[]) => searchPlayer(...args);
		}
	};
});

const player = (id: number, firstName: string, lastName: string, club?: string) =>
	({ id, firstName, lastName, club }) as PlayerInfoDto;

const ok = (data: PlayerInfoDto[]) => ({ status: 200, data });

function setup(over: Record<string, unknown> = {}) {
	const onSelect = vi.fn();
	render(PlayerSearchInput, {
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

describe('turning a query into a name', () => {
	beforeEach(() => {
		searchPlayer.mockReset();
		searchPlayer.mockResolvedValue(ok([]));
	});

	it('treats a bare word as a surname — how people actually search', async () => {
		const { user } = setup();
		await type(user, 'Carlsen');
		await clickSearch(user);
		expect(searchPlayer).toHaveBeenCalledWith('', 'Carlsen');
	});

	it('splits on the first space', async () => {
		const { user } = setup();
		await type(user, 'Magnus Carlsen');
		await clickSearch(user);
		expect(searchPlayer).toHaveBeenCalledWith('Magnus', 'Carlsen');
	});

	it('keeps everything after the first space as the surname', async () => {
		// A double-barrelled surname must not be truncated at the second space.
		const { user } = setup();
		await type(user, 'Anna Maria Svensson');
		await clickSearch(user);
		expect(searchPlayer).toHaveBeenCalledWith('Anna', 'Maria Svensson');
	});

	it('ignores surrounding whitespace', async () => {
		const { user } = setup();
		await type(user, '  Carlsen  ');
		await clickSearch(user);
		expect(searchPlayer).toHaveBeenCalledWith('', 'Carlsen');
	});

	it('does not search for nothing', async () => {
		const { user } = setup();
		await type(user, '   ');
		expect(screen.getByRole('button', { name: 'Sök' })).toBeDisabled();
		expect(searchPlayer).not.toHaveBeenCalled();
	});
});

describe('running a search', () => {
	beforeEach(() => searchPlayer.mockReset());

	it('searches on Enter as well as the button', async () => {
		searchPlayer.mockResolvedValue(ok([]));
		const { user } = setup();
		await type(user, 'Carlsen{Enter}');
		expect(searchPlayer).toHaveBeenCalledWith('', 'Carlsen');
	});

	it('lists the results, with the club beside the name', async () => {
		searchPlayer.mockResolvedValue(
			ok([player(1, 'Magnus', 'Carlsen', 'Offerspill'), player(2, 'Anna', 'Carlsen')])
		);
		const { user } = setup();
		await type(user, 'Carlsen');
		await clickSearch(user);

		expect(await screen.findByText(/Magnus Carlsen/)).toBeInTheDocument();
		expect(screen.getByText('(Offerspill)')).toBeInTheDocument();
		expect(screen.getByText(/Anna Carlsen/)).toBeInTheDocument();
	});

	it('hands the chosen player back and fills the field with their name', async () => {
		searchPlayer.mockResolvedValue(ok([player(1, 'Magnus', 'Carlsen')]));
		const { onSelect, user } = setup();
		await type(user, 'Carlsen');
		await clickSearch(user);
		await user.click(await screen.findByRole('button', { name: /Magnus Carlsen/ }));

		expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
		expect(screen.getByRole('textbox')).toHaveValue('Magnus Carlsen');
	});

	it('says so when nobody matches', async () => {
		searchPlayer.mockResolvedValue(ok([]));
		const { user } = setup();
		await type(user, 'Nobody');
		await clickSearch(user);
		expect(await screen.findByText('Inga spelare hittades')).toBeInTheDocument();
	});

	it('says the same when the request fails', async () => {
		// What a network failure actually looks like: the SDK never throws, it
		// resolves with a status. Verified against a dead host — `{status: 0,
		// error: 'fetch failed'}`.
		searchPlayer.mockResolvedValue({ status: 0, error: 'fetch failed' });
		const { user } = setup();
		await type(user, 'Carlsen');
		await clickSearch(user);
		expect(await screen.findByText('Inga spelare hittades')).toBeInTheDocument();
	});

	it('shows the helper text until there is something to say', async () => {
		searchPlayer.mockResolvedValue(ok([]));
		const { user } = setup({ helperText: 'Skriv efternamn' });
		expect(screen.getByText('Skriv efternamn')).toBeInTheDocument();

		await type(user, 'Nobody');
		await clickSearch(user);
		expect(await screen.findByText('Inga spelare hittades')).toBeInTheDocument();
		expect(screen.queryByText('Skriv efternamn')).toBeNull();
	});

	it('renders no string it was not given', async () => {
		searchPlayer.mockResolvedValue(ok([]));
		const { user } = setup();
		await type(user, 'Nobody');
		await clickSearch(user);
		expect(document.body.textContent).not.toMatch(/No players found|Search by name/i);
	});
});
