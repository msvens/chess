import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { PrintData, PrintGroupData } from '$lib/print/printData';
import { ORGANIZATIONS_STATE_KEY, OrganizationsState } from '$lib/stores/organizations.svelte';
import PrintableTournament from './PrintableTournament.svelte';

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

const classGroup = (id: number, name: string) =>
	({ id, name, rankingAlgorithm: null }) as unknown as PrintGroupData['group'];

const group = (over: Partial<PrintGroupData>): PrintGroupData =>
	({
		group: classGroup(100, 'Grupp A'),
		className: 'Elit',
		multipleClasses: false,
		multipleGroups: false,
		kind: 'individual',
		standings: [],
		teamStandings: [],
		roundResults: [],
		playerMap: new Map(),
		rounds: [1],
		...over
	}) as PrintGroupData;

const data = (groups: PrintGroupData[]): PrintData =>
	({
		tournament: {
			id: 5835,
			name: 'Test Open',
			start: '2026-03-07',
			end: '2026-03-09',
			city: 'Stockholm'
		},
		groups
	}) as PrintData;

const setup = (groups: PrintGroupData[], round = 1) =>
	render(PrintableTournament, {
		props: { data: data(groups), round, fontMode: 'medium', auto: true },
		context: new Map([[ORGANIZATIONS_STATE_KEY, new TestOrganizations()]])
	});

const pages = () => document.querySelectorAll('.print-page');

describe('PrintableTournament', () => {
	it('gives an individual group a pairing sheet and then a standings sheet', () => {
		setup([group({})]);
		const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent?.trim());
		expect(headings).toEqual(['Rond 1', 'Ställning']);
	});

	it('gives a team group the team sheets', () => {
		setup([
			group({
				kind: 'team',
				teamStandings: [
					{ contenderId: 10, teamNumber: 1, place: 1, points: 12, secPoints: 28.5 }
				] as PrintGroupData['teamStandings']
			})
		]);
		// The team standings sheet's second column is the team, not the player.
		expect(screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())).toContain('Lag');
		expect(screen.getByText('Club 10')).toBeInTheDocument();
	});

	it('heads every sheet with the tournament and its dates', () => {
		setup([group({})]);
		expect(screen.getAllByRole('heading', { level: 1, name: 'Test Open' })).toHaveLength(2);
		expect(screen.getAllByText(/2026-03-07 – 2026-03-09 · Stockholm/)).toHaveLength(2);
	});

	it('names the class in the heading only when the tournament has several', () => {
		setup([group({ multipleClasses: true, className: 'Elit' })]);
		expect(screen.getAllByRole('heading', { level: 1 })[0]).toHaveTextContent('Test Open – Elit');
	});

	it('names the group in the section title only when its class has several', () => {
		setup([group({ multipleGroups: true })]);
		expect(screen.getAllByRole('heading', { level: 2 })[0]).toHaveTextContent('Rond 1 – Grupp A');
	});

	it('lays every group out in order', () => {
		setup([group({ group: classGroup(100, 'A') }), group({ group: classGroup(101, 'B') })]);
		expect(pages()).toHaveLength(4);
	});

	it('replaces a Schackfyran sheet with the notice and a link to the official site', () => {
		// The federation withholds these individual standings because the players
		// are children. Nothing was fetched, so there is nothing to print.
		setup([group({ kind: 'individuallyPairedTeam' })]);

		expect(pages()).toHaveLength(1);
		expect(screen.queryByRole('table')).toBeNull();
		expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
		expect(screen.getByRole('link')).toHaveAttribute(
			'href',
			'https://resultat.schack.se/ShowTournamentServlet?id=100'
		);
		// The tournament header still prints, so the sheet says what it is about.
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Open');
	});
});
