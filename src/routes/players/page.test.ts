import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './+page.svelte';

const goto = vi.fn();
const getPlayerInfo = vi.fn();
const getPlayerByFIDEId = vi.fn();
const getRecentPlayers = vi.fn(() => [] as { id: number; name: string; club?: string }[]);

vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => goto(...args) }));

vi.mock('$lib/recentPlayers', () => ({ getRecentPlayers: () => getRecentPlayers() }));

vi.mock('$lib/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api')>();
	return {
		...actual,
		PlayerService: class {
			getPlayerInfo = (...args: unknown[]) => getPlayerInfo(...args);
			getPlayerByFIDEId = (...args: unknown[]) => getPlayerByFIDEId(...args);
			// The name search is exercised in PlayerSearchInput's own test; here it
			// only has to exist so the component mounts.
			searchPlayer = () => Promise.resolve({ status: 200, data: [] });
		}
	};
});

/** The two id fields are the second and third text boxes; the first is the name search. */
const memberIdField = () => screen.getAllByRole('spinbutton')[0];
const fideIdField = () => screen.getAllByRole('spinbutton')[1];

const searchButtonFor = (field: HTMLElement) => {
	const button = field.closest('div')?.parentElement?.querySelector('button');
	if (!button) throw new Error('no search button beside the field');
	return button;
};

describe('players search page', () => {
	beforeEach(() => {
		goto.mockReset();
		getPlayerInfo.mockReset();
		getPlayerByFIDEId.mockReset();
		getRecentPlayers.mockReturnValue([]);
	});

	it('goes to the profile of a member id that resolves', async () => {
		getPlayerInfo.mockResolvedValue({ status: 200, data: { id: 408550 } });
		render(Page);
		const user = userEvent.setup();

		await user.type(memberIdField(), '408550');
		await user.click(searchButtonFor(memberIdField()));

		expect(getPlayerInfo).toHaveBeenCalledWith(408550);
		expect(goto).toHaveBeenCalledWith('/players/408550');
	});

	it('navigates to the id the API returned, not the one typed', async () => {
		// A FIDE id is not a member id, so the lookup's whole point is the swap.
		getPlayerByFIDEId.mockResolvedValue({ status: 200, data: { id: 408550 } });
		render(Page);
		const user = userEvent.setup();

		await user.type(fideIdField(), '1503014');
		await user.click(searchButtonFor(fideIdField()));

		expect(getPlayerByFIDEId).toHaveBeenCalledWith(1503014);
		expect(goto).toHaveBeenCalledWith('/players/408550');
	});

	it('says so inline, and stays put, when the id does not resolve', async () => {
		getPlayerInfo.mockResolvedValue({ status: 404 });
		render(Page);
		const user = userEvent.setup();

		await user.type(memberIdField(), '1');
		await user.click(searchButtonFor(memberIdField()));

		expect(await screen.findByText('Spelare hittades inte')).toBeInTheDocument();
		expect(goto).not.toHaveBeenCalled();
	});

	it('clears the error as soon as the id is edited again', async () => {
		getPlayerInfo.mockResolvedValue({ status: 404 });
		render(Page);
		const user = userEvent.setup();

		await user.type(memberIdField(), '1');
		await user.click(searchButtonFor(memberIdField()));
		await screen.findByText('Spelare hittades inte');

		await user.type(memberIdField(), '2');
		expect(screen.queryByText('Spelare hittades inte')).toBeNull();
	});

	it('searches on Enter too', async () => {
		getPlayerInfo.mockResolvedValue({ status: 200, data: { id: 7 } });
		render(Page);
		const user = userEvent.setup();

		await user.type(memberIdField(), '7{Enter}');
		expect(getPlayerInfo).toHaveBeenCalledWith(7);
	});

	it('lists recent players, club and all, and links each one', async () => {
		getRecentPlayers.mockReturnValue([
			{ id: 1, name: 'Magnus Carlsen', club: 'Offerspill' },
			{ id: 2, name: 'Anna Svensson' }
		]);
		render(Page);
		const user = userEvent.setup();

		expect(screen.getByText('Anna Svensson')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Magnus Carlsen, Offerspill' }));
		expect(goto).toHaveBeenCalledWith('/players/1');
	});

	it('hides the recent list entirely when there is none', () => {
		render(Page);
		expect(screen.queryByText('Senaste Spelare')).toBeNull();
	});
});
