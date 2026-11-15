import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DistrictDTO, TournamentDto } from '$lib/api';
import { ORGANIZATIONS_STATE_KEY, OrganizationsState } from '$lib/stores/organizations.svelte';
import Page from './+page.svelte';

const searchComingTournaments = vi.fn();
const getTournamentsToday = vi.fn();

vi.mock('$lib/api', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api')>()),
	getTournamentsToday: (...args: unknown[]) => getTournamentsToday(...args),
	TournamentService: class {
		searchComingTournaments = (...args: unknown[]) => searchComingTournaments(...args);
	}
}));

const INDIVIDUAL = 3;
const GRAND_PRIX = 7;

/** Local `YYYY-MM-DD`, `offset` days from today. */
function isoDay(offset = 0): string {
	const d = new Date();
	d.setDate(d.getDate() + offset);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A one-day event today, unless dates or classes say otherwise. */
const tournament = (
	id: number,
	name: string,
	type = INDIVIDUAL,
	orgNumber = 1,
	over: Partial<TournamentDto> = {}
) =>
	({
		id,
		name,
		type,
		orgType: 1,
		orgNumber,
		start: isoDay(),
		end: isoDay(),
		...over
	}) as TournamentDto;

/** A season-long league with one group playing on the given days. */
const league = (id: number, name: string, roundDays: number[]) =>
	tournament(id, name, INDIVIDUAL, 1, {
		start: isoDay(-60),
		end: isoDay(60),
		rootClasses: [
			{
				classID: 1,
				className: name,
				subClasses: [],
				groups: [
					{
						id: id * 10,
						name: 'Division 1',
						tournamentRounds: roundDays.map((offset) => ({ roundDate: isoDay(offset) }))
					}
				]
			}
		] as unknown as TournamentDto['rootClasses']
	});

/** The coming list, and the tournaments ending today it leaves out. */
function respond(coming: TournamentDto[], endingToday: TournamentDto[] = []) {
	searchComingTournaments.mockResolvedValue({ status: 200, data: coming });
	getTournamentsToday.mockResolvedValue({ status: 200, data: endingToday });
}

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

beforeEach(() => {
	searchComingTournaments.mockReset();
	getTournamentsToday.mockReset();
});

describe('the today page', () => {
	it('lists what is being played, without Grand Prix series', async () => {
		respond([tournament(1, 'Farsta JGP'), tournament(2, 'Grand Prix-serien', GRAND_PRIX)]);
		setup();
		expect(await screen.findByRole('link', { name: 'Farsta JGP' })).toBeInTheDocument();
		expect(screen.queryByText('Grand Prix-serien')).toBeNull();
	});

	it('shows every district by default, and narrows to the one picked', async () => {
		respond([
			tournament(1, 'Farsta JGP', INDIVIDUAL, 100),
			tournament(2, 'Lund Open', INDIVIDUAL, 200)
		]);
		const user = setup({ 100: 7, 200: 8 });
		expect(await screen.findByRole('link', { name: 'Farsta JGP' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Lund Open' })).toBeInTheDocument();

		await user.click(districtTrigger());
		await user.click(screen.getByRole('option', { name: /Skånes/ }));
		expect(screen.getByRole('link', { name: 'Lund Open' })).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'Farsta JGP' })).toBeNull();
	});

	it('offers only the districts playing today', async () => {
		respond([
			tournament(1, 'Farsta JGP', INDIVIDUAL, 100),
			tournament(2, 'Ownerless', INDIVIDUAL, 300)
		]);
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
		respond([]);
		setup();
		expect(await screen.findByText('Inga turneringar hittades för idag.')).toBeInTheDocument();
		expect(screen.queryByRole('button', { expanded: false })).toBeNull();
	});

	it('lists a league on an evening it plays, with the group playing', async () => {
		respond([league(1, 'KM', [-7, 0, 7])]);
		setup();
		expect(await screen.findByRole('link', { name: 'KM' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Division 1' })).toHaveAttribute(
			'href',
			'/results/1/10'
		);
	});

	it('leaves out a league with no round today', async () => {
		respond([league(1, 'KM', [-7, 7]), tournament(2, 'Farsta JGP')]);
		setup();
		await screen.findByRole('link', { name: 'Farsta JGP' });
		expect(screen.queryByRole('link', { name: 'KM' })).toBeNull();
	});

	it('includes the middle day of a weekend event', async () => {
		respond([tournament(1, 'Helg-Open', INDIVIDUAL, 1, { start: isoDay(-1), end: isoDay(1) })]);
		setup();
		expect(await screen.findByRole('link', { name: 'Helg-Open' })).toBeInTheDocument();
	});

	it('adds what ends today, which the coming list leaves out', async () => {
		respond([], [tournament(1, 'Ends Today Open')]);
		setup();
		expect(await screen.findByRole('link', { name: 'Ends Today Open' })).toBeInTheDocument();
	});

	it('still lists the coming list when the search for today fails', async () => {
		searchComingTournaments.mockResolvedValue({ status: 200, data: [tournament(1, 'Farsta JGP')] });
		getTournamentsToday.mockResolvedValue({ status: 500, error: 'boom' });
		setup();
		expect(await screen.findByRole('link', { name: 'Farsta JGP' })).toBeInTheDocument();
	});

	it('says so when the coming list fails', async () => {
		searchComingTournaments.mockResolvedValue({ status: 500, error: 'boom' });
		getTournamentsToday.mockResolvedValue({ status: 200, data: [] });
		setup();
		expect(await screen.findByText('Kunde inte ladda turneringar')).toBeInTheDocument();
	});
});
