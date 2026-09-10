import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JgpSeason } from '$lib/data/jgp/types';
import type { JgpAgeClassTable, JgpStandingRow } from '$lib/junior/jgpEngine';
import { ORGANIZATIONS_STATE_KEY, OrganizationsState } from '$lib/stores/organizations.svelte';
import JgpStandings from './JgpStandings.svelte';

const loadSeasonStandings = vi.fn();

vi.mock('$lib/junior/jgpStandings', () => ({
	loadSeasonStandings: (...args: unknown[]) => loadSeasonStandings(...args)
}));

/**
 * The real season catalogue is hand-maintained and grows; mocking it keeps the
 * page's behaviour — which division has which years, what the tabs do — under
 * the test's control rather than the data's.
 */
const season = (over: Partial<JgpSeason>): JgpSeason =>
	({
		year: 2026,
		division: 'open',
		scoring: 'ladder',
		dispensations: [],
		clubExceptions: [],
		tournaments: [
			{
				label: 'Tyresö JGP 2026',
				shortLabel: 'Tyresö',
				date: '2026-03-07',
				tournamentId: 6544,
				groups: []
			}
		],
		...over
	}) as JgpSeason;

vi.mock('$lib/data/jgp/seasons', () => ({
	get jgpSeasons() {
		return seasons;
	}
}));

let seasons: JgpSeason[] = [];

const row = (over: Partial<JgpStandingRow> = {}): JgpStandingRow => ({
	memberId: 1,
	name: 'Anna Svensson',
	birthYear: 2013,
	clubName: 'SK Rockaden',
	perTournament: [25],
	total: 25,
	played: 1,
	place: 1,
	...over
});

const ageTable = (label: string, rows = [row()]): JgpAgeClassTable => ({
	ageClass: { label, fromYear: 0, toYear: 9999 },
	rows
});

class TestOrganizations extends OrganizationsState {
	constructor(loading: boolean) {
		super();
		this.loading = loading;
	}
	override async load() {}
}

function setup(orgLoading = false) {
	render(JgpStandings, {
		context: new Map([[ORGANIZATIONS_STATE_KEY, new TestOrganizations(orgLoading)]])
	});
	return userEvent.setup();
}

const divisionTab = (name: string) => screen.getByRole('button', { name });

/** The year dropdown's trigger; the age-class tabs are plain buttons. */
const yearTrigger = () => screen.getByRole('button', { expanded: false });

describe('JgpStandings', () => {
	beforeEach(() => {
		localStorage.clear();
		loadSeasonStandings.mockReset();
		loadSeasonStandings.mockResolvedValue([ageTable('2013')]);
		seasons = [
			season({ year: 2026, division: 'open' }),
			season({ year: 2025, division: 'open' }),
			season({ year: 2026, division: 'girls', scoring: 'percentile' })
		];
	});

	it('waits for the club data before scoring anything', async () => {
		// Without clubs every player resolves to no district, so the whole table
		// would be filtered away as non-Stockholm.
		setup(true);
		expect(loadSeasonStandings).not.toHaveBeenCalled();
		expect(screen.getByText('Beräknar ställning…')).toBeInTheDocument();
	});

	it('scores the newest open season once the clubs are in', async () => {
		setup();
		await vi.waitFor(() => expect(loadSeasonStandings).toHaveBeenCalledTimes(1));
		expect(loadSeasonStandings.mock.calls[0][0]).toMatchObject({ year: 2026, division: 'open' });
		expect(await screen.findByRole('link', { name: 'Anna Svensson' })).toBeInTheDocument();
	});

	it('shows the demo and estimate banners, and the official link', () => {
		setup();
		expect(screen.getByText(/Under uppbyggnad/)).toBeInTheDocument();
		expect(screen.getByText(/Beräknad från officiella SSF-resultat/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Officiella JGP-sidor/ })).toHaveAttribute(
			'href',
			'https://www.stockholmsschack.se/juniortavlingar/#junior-grand-prix'
		);
	});

	it('switches division, and remembers it', async () => {
		const user = setup();
		await vi.waitFor(() => expect(loadSeasonStandings).toHaveBeenCalledTimes(1));

		await user.click(divisionTab('Tjejer'));
		await vi.waitFor(() =>
			expect(loadSeasonStandings.mock.calls[1][0]).toMatchObject({ division: 'girls' })
		);
		expect(localStorage.getItem('junior-jgp-division')).toBe('girls');
	});

	it('opens on the division and season last looked at', async () => {
		localStorage.setItem('junior-jgp-division', 'girls');
		localStorage.setItem('junior-jgp-year', '2026');
		setup();

		await vi.waitFor(() =>
			expect(loadSeasonStandings.mock.calls[0][0]).toMatchObject({
				year: 2026,
				division: 'girls'
			})
		);
	});

	it('falls back to the newest season when the other division never ran that year', async () => {
		// Girls has only 2026; a remembered 2025 must not leave the page empty.
		localStorage.setItem('junior-jgp-year', '2025');
		const user = setup();
		await vi.waitFor(() =>
			expect(loadSeasonStandings.mock.calls[0][0]).toMatchObject({ year: 2025 })
		);

		await user.click(divisionTab('Tjejer'));
		await vi.waitFor(() =>
			expect(loadSeasonStandings.mock.calls[1][0]).toMatchObject({ year: 2026, division: 'girls' })
		);
	});

	it('lists that division seasons newest first, and loads the one picked', async () => {
		const user = setup();
		await vi.waitFor(() => expect(loadSeasonStandings).toHaveBeenCalledTimes(1));

		await user.click(yearTrigger());
		expect(screen.getAllByRole('option').map((o) => o.textContent?.trim())).toEqual([
			'2026',
			'2025'
		]);

		await user.click(screen.getByRole('option', { name: '2025' }));
		await vi.waitFor(() =>
			expect(loadSeasonStandings.mock.calls[1][0]).toMatchObject({ year: 2025 })
		);
		expect(localStorage.getItem('junior-jgp-year')).toBe('2025');
	});

	it('tabs the open division by age class, showing the first until one is picked', async () => {
		loadSeasonStandings.mockResolvedValue([
			ageTable('2013', [row({ memberId: 1, name: 'Yngre spelare' })]),
			ageTable('2014', [row({ memberId: 2, name: 'Äldre spelare' })])
		]);
		const user = setup();

		expect(await screen.findByRole('link', { name: 'Yngre spelare' })).toBeInTheDocument();
		await user.click(divisionTab('2014'));
		expect(screen.getByRole('link', { name: 'Äldre spelare' })).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'Yngre spelare' })).toBeNull();
	});

	it('has no age tabs for girls — it is one combined ranking', async () => {
		const user = setup();
		await vi.waitFor(() => expect(loadSeasonStandings).toHaveBeenCalledTimes(1));
		// The open division's single mocked table is labelled; girls comes back
		// with an empty label, and gets no tab row either way.
		await user.click(divisionTab('Tjejer'));
		await vi.waitFor(() => expect(loadSeasonStandings).toHaveBeenCalledTimes(2));
		expect(screen.queryByRole('button', { name: '2013' })).toBeNull();
	});

	it('links to the finals when the season has one, and only for the open series', async () => {
		seasons = [
			season({ year: 2026, division: 'open', finalsTournamentId: 7000 }),
			season({ year: 2026, division: 'girls', scoring: 'percentile', finalsTournamentId: 7001 })
		];
		const user = setup();
		await vi.waitFor(() => expect(loadSeasonStandings).toHaveBeenCalledTimes(1));
		expect(screen.getByRole('link', { name: /Visa finalen/ })).toHaveAttribute(
			'href',
			'/results/7000'
		);

		await user.click(divisionTab('Tjejer'));
		await vi.waitFor(() => expect(loadSeasonStandings).toHaveBeenCalledTimes(2));
		expect(screen.queryByRole('link', { name: /Visa finalen/ })).toBeNull();
	});

	it('shows the tournament key above the table', async () => {
		setup();
		await vi.waitFor(() => expect(loadSeasonStandings).toHaveBeenCalledTimes(1));
		const key = screen.getByRole('list');
		expect(within(key).getByRole('link', { name: 'Tyresö JGP 2026' })).toHaveAttribute(
			'href',
			'/results/6544'
		);
	});

	it('reports a failure with the reason', async () => {
		loadSeasonStandings.mockRejectedValue(new Error('upstream said no'));
		setup();
		expect(
			await screen.findByText('Kunde inte ladda ställningen: upstream said no')
		).toBeInTheDocument();
	});

	it('says so when a season scores nobody', async () => {
		loadSeasonStandings.mockResolvedValue([ageTable('2013', [])]);
		setup();
		expect(
			await screen.findByText('Ingen ställning tillgänglig för den här säsongen.')
		).toBeInTheDocument();
	});
});
