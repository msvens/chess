import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DistrictDTO, TournamentToday } from '$lib/api';
import { ORGANIZATIONS_STATE_KEY, OrganizationsState } from '$lib/stores/organizations.svelte';
import Page from './+page.svelte';

const getTournamentsToday = vi.fn();

vi.mock('$lib/api', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api')>()),
	getTournamentsToday: (...args: unknown[]) => getTournamentsToday(...args)
}));

const INDIVIDUAL = 3;
const GRAND_PRIX = 7;

const tournament = (id: number, name: string, type = INDIVIDUAL, orgNumber = 1) =>
	({ id, name, type, orgType: 1, orgNumber, groupsToday: [] }) as unknown as TournamentToday;

/** Organizers resolved to districts from a table, as in the calendar's page test. */
class TestOrganizations extends OrganizationsState {
	#byOrgNumber: Record<number, number | null>;

	constructor(byOrgNumber: Record<number, number | null>, districts: DistrictDTO[]) {
		super();
		this.#byOrgNumber = byOrgNumber;
		this.districts = districts;
		this.loading = false;
	}

	getDistrictIdForOrganizer(_orgType: number, orgNumber: number): number | null {
		return this.#byOrgNumber[orgNumber] ?? null;
	}
}

const STOCKHOLM = { id: 7, name: 'Stockholms Schackförbund' } as DistrictDTO;
const SKANE = { id: 8, name: 'Skånes Schackförbund' } as DistrictDTO;
const UPPLAND = { id: 9, name: 'Upplands Schackförbund' } as DistrictDTO;

function setup(byOrgNumber: Record<number, number | null> = {}) {
	render(Page, {
		context: new Map([
			[ORGANIZATIONS_STATE_KEY, new TestOrganizations(byOrgNumber, [STOCKHOLM, SKANE, UPPLAND])]
		])
	});
	return userEvent.setup();
}

const districtTrigger = () => screen.getByRole('button', { expanded: false });

beforeEach(() => getTournamentsToday.mockReset());

describe('the today page', () => {
	it('lists what is being played, without Grand Prix series', async () => {
		getTournamentsToday.mockResolvedValue({
			status: 200,
			data: [tournament(1, 'Farsta JGP'), tournament(2, 'Grand Prix-serien', GRAND_PRIX)]
		});
		setup();
		expect(await screen.findByRole('link', { name: 'Farsta JGP' })).toBeInTheDocument();
		expect(screen.queryByText('Grand Prix-serien')).toBeNull();
	});

	it('shows every district by default, and narrows to the one picked', async () => {
		getTournamentsToday.mockResolvedValue({
			status: 200,
			data: [
				tournament(1, 'Farsta JGP', INDIVIDUAL, 100),
				tournament(2, 'Lund Open', INDIVIDUAL, 200)
			]
		});
		const user = setup({ 100: 7, 200: 8 });
		expect(await screen.findByRole('link', { name: 'Farsta JGP' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Lund Open' })).toBeInTheDocument();

		await user.click(districtTrigger());
		await user.click(screen.getByRole('option', { name: /Skånes/ }));
		expect(screen.getByRole('link', { name: 'Lund Open' })).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'Farsta JGP' })).toBeNull();
	});

	it('offers only the districts playing today', async () => {
		getTournamentsToday.mockResolvedValue({
			status: 200,
			data: [
				tournament(1, 'Farsta JGP', INDIVIDUAL, 100),
				tournament(2, 'Ownerless', INDIVIDUAL, 300)
			]
		});
		const user = setup({ 100: 7, 300: null });
		await screen.findByRole('link', { name: 'Farsta JGP' });

		await user.click(districtTrigger());
		const options = screen.getAllByRole('option').map((option) => option.textContent ?? '');
		expect(options.some((label) => label.includes('Stockholms'))).toBe(true);
		expect(options.some((label) => label.includes('Övriga'))).toBe(true);
		expect(options.some((label) => label.includes('Skånes'))).toBe(false);
		expect(options.some((label) => label.includes('Upplands'))).toBe(false);
	});

	it('has no district filter when nothing is being played', async () => {
		getTournamentsToday.mockResolvedValue({ status: 200, data: [] });
		setup();
		expect(await screen.findByText('Inga turneringar hittades för idag.')).toBeInTheDocument();
		expect(screen.queryByRole('button', { expanded: false })).toBeNull();
	});

	it('says so when the search fails', async () => {
		getTournamentsToday.mockResolvedValue({ status: 500, error: 'boom' });
		setup();
		expect(await screen.findByText('Kunde inte ladda turneringar')).toBeInTheDocument();
	});
});
