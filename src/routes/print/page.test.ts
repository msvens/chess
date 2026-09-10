import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TournamentDto } from '$lib/api';
import type { PrintData } from '$lib/print/printData';
import { ORGANIZATIONS_STATE_KEY, OrganizationsState } from '$lib/stores/organizations.svelte';
import { load } from './[tournamentId]/+page';
import GroupPrintPage from './[tournamentId]/[groupId]/+page.svelte';

const getTournament = vi.fn();
const loadPrintData = vi.fn();

vi.mock('$lib/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api')>();
	return {
		...actual,
		TournamentService: class {
			getTournament = (...args: unknown[]) => getTournament(...args);
		}
	};
});

vi.mock('$lib/print/printData', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/print/printData')>();
	return { ...actual, loadPrintData: (...args: unknown[]) => loadPrintData(...args) };
});

let params: Record<string, string> = {};
vi.mock('$app/state', () => ({
	page: {
		get params() {
			return params;
		}
	}
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

class TestOrganizations extends OrganizationsState {
	constructor() {
		super();
		this.loading = false;
	}
	override async load() {}
	override getClubName(orgNumber: number): string {
		return `Club ${orgNumber}`;
	}
}

const tournament = {
	id: 5835,
	name: 'Test Open',
	start: '2026-03-07',
	end: '2026-03-09',
	city: 'Stockholm',
	// Two groups, so the toolbar offers the group picker and the all-groups toggle.
	rootClasses: [
		{
			classID: 1,
			className: 'Elit',
			groups: [
				{ id: 100, name: 'A' },
				{ id: 101, name: 'B' }
			]
		}
	]
} as unknown as TournamentDto;

const printData = (rounds: number[]): PrintData =>
	({
		tournament,
		groups: [
			{
				group: { id: 100, name: 'A', rankingAlgorithm: null },
				className: 'Elit',
				multipleClasses: false,
				multipleGroups: false,
				kind: 'individual',
				standings: [],
				teamStandings: [],
				roundResults: rounds.map((roundNr, i) => ({
					id: i,
					roundNr,
					board: 1,
					homeId: 1,
					awayId: 2,
					homeResult: 0,
					awayResult: 0
				})),
				playerMap: new Map(),
				rounds
			}
		]
	}) as unknown as PrintData;

const renderPage = () =>
	render(GroupPrintPage, {
		context: new Map([[ORGANIZATIONS_STATE_KEY, new TestOrganizations()]])
	});

describe('/print/[tournamentId]', () => {
	beforeEach(() => getTournament.mockReset());

	it('redirects to the first group', async () => {
		getTournament.mockResolvedValue({ status: 200, data: tournament });
		await expect(load({ params: { tournamentId: '5835' } } as never)).rejects.toMatchObject({
			status: 307,
			location: '/print/5835/100'
		});
	});

	it('is a 404 for an id that is not a number, without asking upstream', async () => {
		await expect(load({ params: { tournamentId: 'abc' } } as never)).rejects.toMatchObject({
			status: 404
		});
		expect(getTournament).not.toHaveBeenCalled();
	});

	it('is a 404 for a tournament that does not resolve', async () => {
		getTournament.mockResolvedValue({ status: 404 });
		await expect(load({ params: { tournamentId: '1' } } as never)).rejects.toMatchObject({
			status: 404
		});
	});

	it('is a 404 for a tournament with no groups to print', async () => {
		getTournament.mockResolvedValue({ status: 200, data: { ...tournament, rootClasses: [] } });
		await expect(load({ params: { tournamentId: '5835' } } as never)).rejects.toMatchObject({
			status: 404
		});
	});
});

describe('/print/[tournamentId]/[groupId]', () => {
	beforeEach(() => {
		loadPrintData.mockReset();
		loadPrintData.mockResolvedValue(printData([1, 2, 3]));
		params = { tournamentId: '5835', groupId: '100' };
	});

	it('loads just this group, and opens on the latest round', async () => {
		renderPage();
		await vi.waitFor(() => expect(loadPrintData).toHaveBeenCalledWith(5835, 100));
		expect(await screen.findByRole('heading', { level: 2, name: 'Rond 3' })).toBeInTheDocument();
	});

	it('keeps the round being looked at when all groups are switched on', async () => {
		// The Next app rebuilt the round list on every fetch and jumped back to
		// the last round, throwing away the round the printer had chosen.
		const user = userEvent.setup();
		renderPage();
		await screen.findByRole('heading', { level: 2, name: 'Rond 3' });

		const roundTrigger = screen.getAllByRole('button', { expanded: false }).at(-1)!;
		await user.click(roundTrigger);
		await user.click(screen.getByRole('option', { name: 'Rond 1' }));
		expect(screen.getByRole('heading', { level: 2, name: 'Rond 1' })).toBeInTheDocument();

		await user.click(screen.getByRole('checkbox', { name: 'Alla grupper' }));
		await vi.waitFor(() => expect(loadPrintData).toHaveBeenCalledWith(5835, undefined));
		expect(screen.getByRole('heading', { level: 2, name: 'Rond 1' })).toBeInTheDocument();
	});

	it('falls back to the latest round when the chosen one is gone', async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByRole('heading', { level: 2, name: 'Rond 3' });

		loadPrintData.mockResolvedValue(printData([7, 8]));
		await user.click(screen.getByRole('checkbox', { name: 'Alla grupper' }));

		expect(await screen.findByRole('heading', { level: 2, name: 'Rond 8' })).toBeInTheDocument();
	});

	it('still offers the toolbar for a group with no rounds, so it is not a dead end', async () => {
		// A Schackfyran has no rounds; without this the page had no way back and
		// no way to print.
		loadPrintData.mockResolvedValue(printData([]));
		renderPage();

		expect(await screen.findByRole('link', { name: /Tillbaka/ })).toHaveAttribute(
			'href',
			'/results/5835/100'
		);
		expect(screen.getByRole('button', { name: 'Skriv ut' })).toBeInTheDocument();
	});

	it('says so when the data cannot be loaded', async () => {
		loadPrintData.mockRejectedValue(new Error('upstream said no'));
		renderPage();
		expect(await screen.findByText('Fel vid laddning av turnering')).toBeInTheDocument();
	});

	it('does not fetch for route params that are not numbers', async () => {
		params = { tournamentId: 'abc', groupId: '100' };
		renderPage();
		expect(loadPrintData).not.toHaveBeenCalled();
		expect(await screen.findByText('Fel vid laddning av turnering')).toBeInTheDocument();
	});
});
