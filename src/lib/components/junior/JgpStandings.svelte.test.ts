import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JgpStandingRow, JgpTable } from '$lib/api/sthlm';
import JgpStandings from './JgpStandings.svelte';

const getJgpStandings = vi.fn();
const getTournamentBatch = vi.fn();

vi.mock('$lib/api/sthlm', () => ({
	getJgpStandings: (...args: unknown[]) => getJgpStandings(...args)
}));

vi.mock('$lib/api', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api')>()),
	TournamentService: class {
		getTournamentBatch = (...args: unknown[]) => getTournamentBatch(...args);
	}
}));

const row = (over: Partial<JgpStandingRow> = {}): JgpStandingRow => ({
	placement: 1,
	memberId: 1,
	name: 'Anna Svensson',
	birthYear: 2013,
	club: 'SK Rockaden',
	points: { 6544: 25 },
	total: 25,
	...over
});

const table = (label: string, rows = [row()]): JgpTable => ({ label, rows });

const respond = (tables: JgpTable[]) =>
	getJgpStandings.mockResolvedValue({
		status: 200,
		data: { lastUpdated: '2026-11-13T12:00:00+00:00', tournamentIds: [6544], tables }
	});

function setup() {
	render(JgpStandings);
	return userEvent.setup();
}

const tab = (name: string) => screen.getByRole('button', { name });

describe('JgpStandings', () => {
	beforeEach(() => {
		localStorage.clear();
		getJgpStandings.mockReset();
		respond([table('2013')]);
		getTournamentBatch.mockReset();
		getTournamentBatch.mockResolvedValue([
			{ data: { id: 6544, name: 'Tyresö JGP 2026', start: '2026-03-07' }, error: null, status: 200 }
		]);
	});

	it('loads the open series and shows its players', async () => {
		setup();
		expect(screen.getByText('Laddar ställning…')).toBeInTheDocument();
		expect(await screen.findByRole('link', { name: 'Anna Svensson' })).toBeInTheDocument();
		expect(getJgpStandings).toHaveBeenCalledWith('open');
	});

	it('links to the official pages, with no demo or estimate banner left', async () => {
		setup();
		await screen.findByRole('link', { name: 'Anna Svensson' });
		expect(screen.getByRole('link', { name: /Officiella JGP-sidor/ })).toHaveAttribute(
			'href',
			'https://www.stockholmsschack.se/juniortavlingar/#junior-grand-prix'
		);
		expect(screen.queryByText(/Under uppbyggnad/)).toBeNull();
		expect(screen.queryByText(/Beräknad från officiella/)).toBeNull();
	});

	it('says when the standings were last updated', async () => {
		setup();
		expect(await screen.findByText('Uppdaterad 13 nov 2026')).toBeInTheDocument();
	});

	it('switches division, and remembers it', async () => {
		const user = setup();
		await screen.findByRole('link', { name: 'Anna Svensson' });

		await user.click(tab('Tjejer'));
		await vi.waitFor(() => expect(getJgpStandings).toHaveBeenLastCalledWith('girls'));
		expect(localStorage.getItem('junior-jgp-division')).toBe('girls');
	});

	it('opens on the division last looked at', async () => {
		localStorage.setItem('junior-jgp-division', 'girls');
		setup();
		await vi.waitFor(() => expect(getJgpStandings).toHaveBeenCalledWith('girls'));
	});

	it('tabs the age classes, showing the first until one is picked', async () => {
		respond([
			table('2013', [row({ memberId: 1, name: 'Äldre spelare' })]),
			table('2014', [row({ memberId: 2, name: 'Yngre spelare' })])
		]);
		const user = setup();

		expect(await screen.findByRole('link', { name: 'Äldre spelare' })).toBeInTheDocument();
		await user.click(tab('2014'));
		expect(screen.getByRole('link', { name: 'Yngre spelare' })).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'Äldre spelare' })).toBeNull();
	});

	it('has no age tabs for the single girls ranking', async () => {
		respond([table('')]);
		setup();
		await screen.findByRole('link', { name: 'Anna Svensson' });
		// Only the two division tabs.
		expect(screen.getAllByRole('button')).toHaveLength(2);
	});

	it('shows the tournament key, named by SSF', async () => {
		setup();
		const key = await screen.findByRole('list');
		expect(within(key).getByRole('link', { name: 'Tyresö JGP 2026' })).toHaveAttribute(
			'href',
			'/results/6544'
		);
	});

	it('reports a failure with the reason', async () => {
		getJgpStandings.mockResolvedValue({ error: 'HTTP 502', status: 502 });
		setup();
		expect(await screen.findByText('Kunde inte ladda ställningen: HTTP 502')).toBeInTheDocument();
	});

	it('says so when nobody is ranked yet', async () => {
		respond([table('2013', [])]);
		setup();
		expect(
			await screen.findByText('Ingen ställning tillgänglig för den här säsongen.')
		).toBeInTheDocument();
	});
});
