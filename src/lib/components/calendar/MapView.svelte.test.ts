import { render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClubDTO, DistrictDTO, TournamentDto } from '$lib/api';
import { ORGANIZATIONS_STATE_KEY, OrganizationsState } from '$lib/stores/organizations.svelte';
import MapView from './MapView.svelte';

const INDIVIDUAL = 3;

// Leaflet is loaded dynamically and touches the DOM in ways jsdom cannot honour;
// the map itself is verified in the browser, not here. What this file covers is
// which tournaments reach the map and which fall out into the list beside it.
vi.mock('./TournamentMap.svelte', async () => {
	const Stub = (await import('./__fixtures__/MapStub.svelte')).default;
	return { default: Stub };
});

const geocodes = {
	stockholm: { lat: 59.33, lng: 18.07 },
	lund: { lat: 55.7, lng: 13.19 }
};

const event = (over: Partial<TournamentDto> = {}): TournamentDto =>
	({
		id: 1,
		name: 'Rilton Cup',
		type: INDIVIDUAL,
		start: '2026-03-10',
		end: '2026-03-12',
		city: 'Stockholm',
		orgType: 1,
		orgNumber: 100,
		...over
	}) as TournamentDto;

class TestOrganizations extends OrganizationsState {
	#clubs: Record<number, ClubDTO>;

	constructor(clubs: Record<number, ClubDTO> = {}) {
		super();
		this.#clubs = clubs;
		this.districts = [] as DistrictDTO[];
		this.loading = false;
	}
	getClub(clubId: number): ClubDTO | undefined {
		return this.#clubs[clubId];
	}
	getOrganizerName(): string {
		return 'Wasa SK';
	}
	getDistrictIdForOrganizer(): number | null {
		return null;
	}
}

const club = (id: number, city: string) => ({ id, name: `Club ${id}`, city }) as ClubDTO;

beforeEach(() => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response(JSON.stringify({ cities: geocodes })))
	);
});

afterEach(() => vi.unstubAllGlobals());

function setup(
	tournaments: TournamentDto[],
	clubs: Record<number, ClubDTO> = {},
	props: Record<string, unknown> = {}
) {
	render(MapView, {
		props: { tournaments, ...props },
		context: new Map([[ORGANIZATIONS_STATE_KEY, new TestOrganizations(clubs)]])
	});
}

describe('which tournaments reach the map', () => {
	it('places one with a city we know', async () => {
		setup([event({ city: 'Stockholm' })]);
		expect(await screen.findByTestId('map-markers')).toHaveTextContent('1');
	});

	it('falls back to the organising club’s city', async () => {
		// 47 of the 137 upcoming tournaments carry no city of their own.
		setup([event({ city: '', orgType: 1, orgNumber: 100 })], { 100: club(100, 'Lund') });
		expect(await screen.findByTestId('map-markers')).toHaveTextContent('1');
	});

	it('treats a blank city as no city at all', async () => {
		setup([event({ city: '   ', orgType: 1, orgNumber: 100 })], { 100: club(100, 'Lund') });
		expect(await screen.findByTestId('map-markers')).toHaveTextContent('1');
	});

	it('does not look up a club when the organiser is not one', async () => {
		// orgType 1 is a club; anything else numbers a different register, so the
		// same number would name the wrong organisation.
		setup([event({ city: '', orgType: 2, orgNumber: 100 })], { 100: club(100, 'Lund') });
		expect(await screen.findByText('Inte på kartan (1)')).toBeInTheDocument();
	});
});

describe('the ones that cannot be placed', () => {
	it('lists them rather than dropping them', async () => {
		setup([event({ id: 1, name: 'Nowhere Open', city: 'Atlantis' })]);
		expect(await screen.findByText('Inte på kartan (1)')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Nowhere Open' })).toHaveAttribute(
			'href',
			'/results/1'
		);
	});

	it('says nothing when everything was placed', async () => {
		setup([event({ city: 'Stockholm' })]);
		await screen.findByTestId('map-markers');
		expect(screen.queryByText(/Inte på kartan/)).toBeNull();
	});

	it('counts them', async () => {
		setup([
			event({ id: 1, city: 'Atlantis' }),
			event({ id: 2, city: 'El Dorado' }),
			event({ id: 3, city: 'Stockholm' })
		]);
		expect(await screen.findByText('Inte på kartan (2)')).toBeInTheDocument();
	});
});

describe('the states with no map', () => {
	it('says it is loading while the tournaments are still coming', () => {
		setup([], {}, { loading: true });
		expect(screen.getByText('Laddar karta…')).toBeInTheDocument();
	});

	it('shows the error it was given', () => {
		setup([], {}, { error: 'Kunde inte ladda turneringar' });
		expect(screen.getByText('Kunde inte ladda turneringar')).toBeInTheDocument();
	});

	it('says there is nothing to show when the filters left nothing', async () => {
		setup([]);
		expect(await screen.findByText('Inga turneringar att visa på kartan.')).toBeInTheDocument();
	});
});
