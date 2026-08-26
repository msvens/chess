import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TournamentDto } from '$lib/api';
import type { DistrictDTO } from '$lib/api';
import { ORGANIZATIONS_STATE_KEY, OrganizationsState } from '$lib/stores/organizations.svelte';
import Page from './+page.svelte';

const searchComingTournaments = vi.fn();

vi.mock('$lib/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api')>();
	return {
		...actual,
		TournamentService: class {
			searchComingTournaments = (...args: unknown[]) => searchComingTournaments(...args);
		}
	};
});

const INDIVIDUAL = 3;
const ALLSVENSKAN = 2;

const tournament = (over: Partial<TournamentDto> = {}): TournamentDto =>
	({
		id: 1,
		name: 'Rilton Cup',
		type: INDIVIDUAL,
		state: 1,
		start: '2026-09-01',
		end: '2026-09-05',
		city: 'Stockholm',
		orgType: 1,
		orgNumber: 100,
		...over
	}) as TournamentDto;

/**
 * The organizations store with its one relevant lookup answered from a table.
 *
 * The real `getDistrictIdForOrganizer` reads indexes built by `load()`, which
 * wants the 19 MB `organizations-all.json`. Everything else — `districts`,
 * `loading` — is public state and is set directly.
 */
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

function setup(
	tournaments: TournamentDto[],
	districts: Record<number, number | null> = {},
	status = 200
) {
	searchComingTournaments.mockResolvedValue(
		status === 200 ? { status, data: tournaments } : { status }
	);
	render(Page, {
		context: new Map([[ORGANIZATIONS_STATE_KEY, new TestOrganizations(districts, [STOCKHOLM])]])
	});
	return userEvent.setup();
}

/** The four filters, in the order they appear. */
const filterTrigger = (index: number) => screen.getAllByRole('button', { expanded: false })[index];

const listTab = () => screen.getByRole('button', { name: 'Lista' });

beforeEach(() => {
	localStorage.clear();
	searchComingTournaments.mockReset();
});

describe('the tab bar', () => {
	it('offers all three views', async () => {
		setup([tournament()]);
		for (const name of ['Kalender', 'Lista', 'Karta']) {
			expect(screen.getByRole('button', { name })).toBeInTheDocument();
		}
	});

	it('opens on the calendar when nothing was remembered', () => {
		setup([tournament()]);
		expect(screen.queryByRole('table')).toBeNull();
	});

	it('opens on the tab last used, without painting the default first', async () => {
		// Read at initialisation rather than in a mount effect, so there is no
		// flash of the calendar tab on the way to the list.
		localStorage.setItem('calendar-active-tab', 'list');
		setup([tournament()]);
		expect(await screen.findByRole('table')).toBeInTheDocument();
	});

	it('remembers the tab that was clicked', async () => {
		const user = setup([tournament()]);
		await user.click(listTab());
		expect(localStorage.getItem('calendar-active-tab')).toBe('list');
	});
});

describe('loading the tournaments', () => {
	it('asks the API once', async () => {
		setup([tournament()]);
		await vi.waitFor(() => expect(searchComingTournaments).toHaveBeenCalledTimes(1));
	});

	it('does not ask again when the language changes', async () => {
		// The React version built its error string inside the fetch and therefore
		// listed `language` as a dependency, so a language toggle refetched all 137
		// tournaments and flashed the loading state.
		const { language } = await import('$lib/stores/language.svelte');
		setup([tournament()]);
		await vi.waitFor(() => expect(searchComingTournaments).toHaveBeenCalledTimes(1));

		language.set(language.current === 'sv' ? 'en' : 'sv');
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(searchComingTournaments).toHaveBeenCalledTimes(1);
		language.set('sv');
	});

	it('says so when the request fails', async () => {
		localStorage.setItem('calendar-active-tab', 'list');
		const user = setup([], {}, 500);
		await user.click(listTab());
		expect(await screen.findByText('Kunde inte ladda turneringar')).toBeInTheDocument();
	});
});

describe('the list tab', () => {
	it('lists what came back', async () => {
		localStorage.setItem('calendar-active-tab', 'list');
		setup([tournament({ id: 1, name: 'Rilton Cup' }), tournament({ id: 2, name: 'SM 2026' })]);
		expect(await screen.findByText('Rilton Cup')).toBeInTheDocument();
		expect(screen.getByText('SM 2026')).toBeInTheDocument();
	});
});

describe('the filters', () => {
	it('narrows the list by type', async () => {
		localStorage.setItem('calendar-active-tab', 'list');
		// Named so the row cannot be confused with the filter option of the same name.
		const user = setup([
			tournament({ id: 1, name: 'Rilton Cup', type: INDIVIDUAL }),
			tournament({ id: 2, name: 'Lag-SM 2026', type: ALLSVENSKAN })
		]);
		await screen.findByText('Rilton Cup');

		await user.click(filterTrigger(2));
		await user.click(screen.getByRole('option', { name: /Allsvenskan/ }));

		expect(screen.getByText('Lag-SM 2026')).toBeInTheDocument();
		expect(screen.queryByText('Rilton Cup')).toBeNull();
	});

	it('narrows the list by district, and counts the ones without one', async () => {
		localStorage.setItem('calendar-active-tab', 'list');
		const user = setup(
			[
				tournament({ id: 1, name: 'Stockholm-event', orgNumber: 100 }),
				tournament({ id: 2, name: 'Ownerless', orgNumber: 200 })
			],
			{ 100: 7, 200: null }
		);
		await screen.findByText('Stockholm-event');

		await user.click(filterTrigger(0));
		await user.click(screen.getByRole('option', { name: /Övriga/ }));

		expect(screen.getByText('Ownerless')).toBeInTheDocument();
		expect(screen.queryByText('Stockholm-event')).toBeNull();
	});
});
