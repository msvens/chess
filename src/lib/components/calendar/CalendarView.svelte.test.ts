import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DistrictDTO, TournamentDto } from '$lib/api';
import { ORGANIZATIONS_STATE_KEY, OrganizationsState } from '$lib/stores/organizations.svelte';
import CalendarView from './CalendarView.svelte';

const INDIVIDUAL = 3;
const GRAND_PRIX = 7;

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
	constructor() {
		super();
		this.districts = [] as DistrictDTO[];
		this.loading = false;
	}
	getOrganizerName(): string {
		return 'Wasa SK';
	}
	getDistrictIdForOrganizer(): number | null {
		return null;
	}
}

function setup(tournaments: TournamentDto[], props: Record<string, unknown> = {}) {
	render(CalendarView, {
		props: { tournaments, ...props },
		context: new Map([[ORGANIZATIONS_STATE_KEY, new TestOrganizations()]])
	});
	return userEvent.setup();
}

const title = () => screen.getByRole('heading').textContent?.trim();
const button = (name: string) => screen.getByRole('button', { name });

beforeEach(() => localStorage.clear());

describe('which period is shown', () => {
	it('opens on the month remembered, not on today', () => {
		// Read at initialisation, so the remembered month does not flash past.
		localStorage.setItem('calendar-anchor', '2026-03-15');
		setup([event()]);
		expect(title()).toBe('mars 2026');
	});

	it('names a week by its range when the week view is remembered', () => {
		localStorage.setItem('calendar-anchor', '2026-03-10');
		localStorage.setItem('calendar-view-mode', 'week');
		setup([event()]);
		expect(title()).toBe('9 mars – 15 mars 2026');
	});

	it('remembers a change of view', async () => {
		localStorage.setItem('calendar-anchor', '2026-03-15');
		const user = setup([event()]);
		await user.selectOptions(screen.getByRole('combobox'), 'week');
		expect(localStorage.getItem('calendar-view-mode')).toBe('week');
	});

	it('remembers where you navigated to', async () => {
		localStorage.setItem('calendar-anchor', '2026-03-15');
		const user = setup([
			event({ id: 1, start: '2026-01-05', end: '2026-01-06' }),
			event({ id: 2, start: '2026-05-05', end: '2026-05-06' })
		]);
		await user.click(button('Nästa'));
		// `addMonths` anchors to the 1st — a month is identified by its month, and
		// stepping from the 31st would otherwise skip a month with fewer days.
		expect(localStorage.getItem('calendar-anchor')).toBe('2026-04-01');
	});
});

describe('how far you can navigate', () => {
	it('will not page past the last event', () => {
		// The endpoint only returns upcoming events, so paging beyond them shows
		// empty months forever.
		localStorage.setItem('calendar-anchor', '2026-03-15');
		setup([event({ start: '2026-03-10', end: '2026-03-12' })]);
		expect(button('Nästa')).toBeDisabled();
		expect(button('Föregående')).toBeDisabled();
	});

	it('opens up once there is somewhere to go', () => {
		localStorage.setItem('calendar-anchor', '2026-03-15');
		setup([
			event({ id: 1, start: '2026-01-05', end: '2026-01-06' }),
			event({ id: 2, start: '2026-05-05', end: '2026-05-06' })
		]);
		expect(button('Nästa')).toBeEnabled();
		expect(button('Föregående')).toBeEnabled();
	});

	it('jumps to the first and last event', async () => {
		localStorage.setItem('calendar-anchor', '2026-03-15');
		const user = setup([
			event({ id: 1, start: '2026-01-05', end: '2026-01-06' }),
			event({ id: 2, start: '2026-05-05', end: '2026-05-06' })
		]);

		await user.click(button('Första evenemanget'));
		expect(title()).toBe('januari 2026');

		await user.click(button('Sista evenemanget'));
		expect(title()).toBe('maj 2026');
	});

	it('locks navigation when there is nothing at all', () => {
		setup([]);
		expect(button('Nästa')).toBeDisabled();
		expect(button('Föregående')).toBeDisabled();
	});
});

describe('the colour key', () => {
	it('lists only the types on screen', async () => {
		localStorage.setItem('calendar-anchor', '2026-03-15');
		const user = setup([event({ id: 1, type: INDIVIDUAL }), event({ id: 2, type: GRAND_PRIX })]);
		await user.click(button('Färger'));

		expect(screen.getByText('Individuell')).toBeInTheDocument();
		expect(screen.getByText('Grand Prix')).toBeInTheDocument();
		expect(screen.queryByText('Allsvenskan')).toBeNull();
	});

	it('is not offered when there is nothing to key', () => {
		setup([]);
		expect(screen.queryByRole('button', { name: 'Färger' })).toBeNull();
	});
});

describe('the states with no grid', () => {
	it('says it is loading', () => {
		setup([], { loading: true });
		expect(screen.getByText('Laddar turneringar...')).toBeInTheDocument();
	});

	it('shows the error it was given', () => {
		setup([], { error: 'Kunde inte ladda turneringar' });
		expect(screen.getByText('Kunde inte ladda turneringar')).toBeInTheDocument();
	});

	it('keeps the navigation bar visible either way', () => {
		setup([], { loading: true });
		expect(button('Idag')).toBeInTheDocument();
	});
});
