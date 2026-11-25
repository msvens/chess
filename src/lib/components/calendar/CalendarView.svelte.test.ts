import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

/** The nav's title; the day list's tournament names are headings too, one level down. */
const title = () => screen.getByRole('heading', { level: 2 }).textContent?.trim();
const button = (name: string) => screen.getByRole('button', { name });

// "Today" is mid-March 2026 for every test; only Date is faked, so user-event's
// timers still run.
beforeEach(() => {
	localStorage.clear();
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(new Date(2026, 2, 15, 12));
});
afterEach(() => vi.useRealTimers());

describe('which period is shown', () => {
	it('opens on today, not on a month looked at before', () => {
		// What the calendar used to remember; it is ignored now.
		localStorage.setItem('calendar-anchor', '2026-01-15');
		setup([event()]);
		expect(title()).toBe('mars 2026');
	});

	it('names a week by its range when the week view is remembered', () => {
		localStorage.setItem('calendar-view-mode', 'week');
		setup([event()]);
		expect(title()).toBe('9–15 mars 2026');
	});

	it('remembers a change of view', async () => {
		const user = setup([event()]);
		await user.selectOptions(screen.getByRole('combobox', { name: 'Vy' }), 'week');
		expect(localStorage.getItem('calendar-view-mode')).toBe('week');
	});

	it('does not remember where you navigated to', async () => {
		const user = setup([
			event({ id: 1, start: '2026-01-05', end: '2026-01-06' }),
			event({ id: 2, start: '2026-05-05', end: '2026-05-06' })
		]);
		await user.click(button('Nästa'));
		expect(title()).toBe('april 2026');
		expect(localStorage.getItem('calendar-anchor')).toBeNull();
	});
});

describe('how far you can navigate', () => {
	it('will not page past the last event', () => {
		// The endpoint only returns upcoming events, so paging beyond them shows
		// empty months forever.
		setup([event({ start: '2026-03-10', end: '2026-03-12' })]);
		expect(button('Nästa')).toBeDisabled();
		expect(button('Föregående')).toBeDisabled();
	});

	it('opens up once there is somewhere to go', () => {
		setup([
			event({ id: 1, start: '2026-01-05', end: '2026-01-06' }),
			event({ id: 2, start: '2026-05-05', end: '2026-05-06' })
		]);
		expect(button('Nästa')).toBeEnabled();
		expect(button('Föregående')).toBeEnabled();
	});

	it('jumps to the first and last event', async () => {
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

describe('game days or tournament dates', () => {
	/** A league over the spring, playing on 10 March. */
	const league = () =>
		event({
			name: 'KM',
			start: '2026-02-01',
			end: '2026-04-30',
			rootClasses: [
				{
					classID: 1,
					className: 'KM',
					subClasses: [],
					groups: [{ id: 10, name: 'A', tournamentRounds: [{ roundDate: '2026-03-10' }] }]
				}
			] as unknown as TournamentDto['rootClasses']
		});

	const dayButton = (day: RegExp) => screen.queryByRole('button', { name: day });

	it('shows game days by default: the league on its round day', () => {
		setup([league()]);
		expect(dayButton(/1 evenemang den .*10 mars/)).toBeInTheDocument();
	});

	it('switches to tournament dates, and remembers it', async () => {
		const user = setup([league()]);
		await user.selectOptions(
			screen.getByRole('combobox', { name: 'Visa turneringar på' }),
			'dates'
		);

		// Over a week long, so only its start in February is marked; March is empty.
		expect(dayButton(/evenemang den .*10 mars/)).toBeNull();
		expect(localStorage.getItem('calendar-day-mode')).toBe('dates');
	});

	it('opens on the mode chosen last time', () => {
		localStorage.setItem('calendar-day-mode', 'dates');
		setup([league()]);
		expect(screen.getByRole('combobox', { name: 'Visa turneringar på' })).toHaveValue('dates');
		expect(dayButton(/evenemang den .*10 mars/)).toBeNull();
	});
});

describe('the agenda layout', () => {
	const AGENDA = { layouts: { mobile: 'agenda', desktop: 'agenda' } };
	const pick = (name: RegExp) => screen.getByRole('button', { name });

	it('opens on today, with today’s events listed below', () => {
		setup([event({ start: '2026-03-15', end: '2026-03-15' })], AGENDA);
		expect(pick(/15 mars/)).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByRole('link', { name: 'Rilton Cup' })).toBeInTheDocument();
	});

	it('lists the day you pick', async () => {
		const user = setup([event()], AGENDA);
		expect(screen.getByText('Inga tävlingar denna dag')).toBeInTheDocument();

		await user.click(pick(/evenemang den .*11 mars/));
		expect(screen.getByText(/onsdag 11 mars/i)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Rilton Cup' })).toBeInTheDocument();
	});

	it('moves a month to its first day', async () => {
		const user = setup([event({ start: '2026-04-20', end: '2026-04-20' })], AGENDA);
		await user.click(button('Nästa'));
		expect(title()).toMatch(/april 2026/);
		expect(pick(/ 1 april/)).toHaveAttribute('aria-pressed', 'true');
	});

	it('moves a week strip seven days at a time', async () => {
		localStorage.setItem('calendar-view-mode', 'week');
		const user = setup([event({ start: '2026-03-22', end: '2026-03-22' })], AGENDA);
		expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(6);

		await user.click(button('Nästa'));
		expect(pick(/22 mars/)).toHaveAttribute('aria-pressed', 'true');
	});

	it('leaves the grid to the other breakpoint', () => {
		setup([event()], { layouts: { mobile: 'agenda', desktop: 'grid' } });
		// jsdom matches no media query, so this is the desktop: the grid, no picker.
		expect(screen.queryByRole('button', { pressed: true })).toBeNull();
	});
});

describe('the day view', () => {
	const toDay = async (user: ReturnType<typeof userEvent.setup>) =>
		user.selectOptions(screen.getByRole('combobox', { name: 'Vy' }), 'day');

	it('shows one day, named in full', async () => {
		const user = setup([event({ start: '2026-03-15', end: '2026-03-15' })]);
		await toDay(user);
		expect(title()).toMatch(/söndag 15 mars 2026/i);
		expect(screen.getByRole('link', { name: 'Rilton Cup' })).toBeInTheDocument();
		expect(localStorage.getItem('calendar-view-mode')).toBe('day');
	});

	it('steps a day at a time, up to the last event', async () => {
		const user = setup([event({ start: '2026-03-10', end: '2026-03-16' })]);
		await toDay(user);
		await user.click(button('Nästa'));
		expect(title()).toMatch(/16 mars/);
		expect(button('Nästa')).toBeDisabled();

		await user.click(button('Föregående'));
		expect(title()).toMatch(/15 mars/);
	});

	it('is the same in the agenda layout: no picker', async () => {
		localStorage.setItem('calendar-view-mode', 'day');
		setup([event({ start: '2026-03-15', end: '2026-03-15' })], {
			layouts: { mobile: 'agenda', desktop: 'agenda' }
		});
		expect(screen.queryByRole('button', { pressed: true })).toBeNull();
		expect(screen.getByRole('link', { name: 'Rilton Cup' })).toBeInTheDocument();
	});
});
