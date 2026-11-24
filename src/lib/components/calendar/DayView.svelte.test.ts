import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DistrictDTO, TournamentDto } from '$lib/api';
import { ORGANIZATIONS_STATE_KEY, OrganizationsState } from '$lib/stores/organizations.svelte';
import { buildDayRow, toDayNumber } from '$lib/utils/calendarLayout';
import { datedDays, playedDays } from '$lib/utils/playedDays';
import DayView from './DayView.svelte';

const INDIVIDUAL = 3;

/** Wednesday 11 June 2025. */
const DAY = new Date(2025, 5, 11);

const event = (over: Partial<TournamentDto> = {}): TournamentDto =>
	({
		id: 1,
		name: 'Rilton Cup',
		type: INDIVIDUAL,
		start: '2025-06-10',
		end: '2025-06-12',
		city: 'Stockholm',
		orgType: 1,
		orgNumber: 100,
		...over
	}) as TournamentDto;

/** One class of groups, all playing on the given round dates. */
const withGroups = (over: Partial<TournamentDto>, groups: [id: number, name: string][]) =>
	event({
		...over,
		rootClasses: [
			{
				classID: 1,
				className: 'Open',
				subClasses: [],
				groups: groups.map(([id, name]) => ({
					id,
					name,
					tournamentRounds: [{ roundNumber: 1, roundDate: '2025-06-11' }]
				}))
			}
		] as unknown as TournamentDto['rootClasses']
	});

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

function setup(tournaments: TournamentDto[], mode: 'played' | 'dates' = 'played') {
	const events = tournaments.map(mode === 'played' ? playedDays : datedDays);
	render(DayView, {
		props: { row: buildDayRow(DAY, events, toDayNumber(DAY)) },
		context: new Map([[ORGANIZATIONS_STATE_KEY, new TestOrganizations()]])
	});
	return userEvent.setup();
}

/** Below the app's mobile breakpoint, until the test ends. */
function onPhone() {
	const desktop = window.matchMedia;
	vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
		...desktop(query),
		matches: query === '(max-width: 767px)'
	}));
}
afterEach(() => vi.restoreAllMocks());

const twoGroups = () =>
	withGroups({}, [
		[10, 'Grupp A'],
		[11, 'Grupp B']
	]);

describe('a day', () => {
	it('says so when nothing is on', () => {
		setup([]);
		expect(screen.getByText('Inga tävlingar denna dag')).toBeInTheDocument();
	});

	it('has no ◀ ▶: the dates say how long a tournament runs', () => {
		setup([event()]);
		expect(screen.queryByText('◀')).toBeNull();
		expect(screen.queryByText('▶')).toBeNull();
	});
});

describe('on a wide screen: cards', () => {
	const card = (name: string) => screen.getByRole('button', { name }).closest('li')!;

	it('shows each tournament with its city, type, organiser and dates', () => {
		setup([event()]);
		const rilton = card('Rilton Cup');
		expect(within(rilton).getByText(/Stockholm/)).toBeInTheDocument();
		expect(within(rilton).getByText('Wasa SK')).toBeInTheDocument();
		expect(within(rilton).getByText(/10.*12 juni/)).toBeInTheDocument();
	});

	it('opens the popover with the groups playing, never jumping past them', async () => {
		const user = setup([withGroups({}, [[10, 'Grupp A']])]);
		expect(screen.queryByRole('link', { name: 'Grupp A' })).toBeNull();

		await user.click(screen.getByRole('button', { name: 'Rilton Cup' }));
		const popover = screen.getByRole('dialog');
		expect(within(popover).getByRole('link', { name: 'Grupp A' })).toHaveAttribute(
			'href',
			'/results/1/10'
		);
	});

	it('says a tournament starts today, in tournament-dates mode', () => {
		// Over a week long, so only its start and end are marked.
		setup([event({ name: 'Långlopp', start: '2025-06-11', end: '2025-06-30' })], 'dates');
		expect(within(card('Långlopp')).getByText('• startar idag')).toBeInTheDocument();
	});

	it('says a tournament ends today', () => {
		setup([event({ name: 'Långlopp', start: '2025-05-20', end: '2025-06-11' })], 'dates');
		expect(within(card('Långlopp')).getByText('◦ slutar idag')).toBeInTheDocument();
	});
});

describe('on a phone: a plain list', () => {
	const row = (name: string) => screen.getByRole('link', { name }).closest('li')!;

	it('has no coloured cards, only a dot', () => {
		onPhone();
		setup([event()]);
		expect(screen.queryByRole('button', { name: 'Rilton Cup' })).toBeNull();
		expect(row('Rilton Cup').className).not.toMatch(/bg-emerald/);
	});

	it('puts city, type and organiser on one line, then the dates', () => {
		onPhone();
		setup([event()]);
		const rilton = row('Rilton Cup');
		expect(within(rilton).getByText('Stockholm · Individuell · Wasa SK')).toBeInTheDocument();
		expect(within(rilton).getByText(/10.*12 juni/)).toBeInTheDocument();
	});

	it('links the tournament and lists the groups playing, without a tap', () => {
		onPhone();
		setup([twoGroups()]);
		expect(screen.getByRole('link', { name: 'Rilton Cup' })).toHaveAttribute('href', '/results/1');
		expect(screen.getByRole('link', { name: 'Grupp A' })).toHaveAttribute('href', '/results/1/10');
		expect(screen.getByRole('link', { name: 'Grupp B' })).toHaveAttribute('href', '/results/1/11');
	});

	it('says a tournament starts today', () => {
		onPhone();
		setup([event({ name: 'Långlopp', start: '2025-06-11', end: '2025-06-30' })], 'dates');
		expect(within(row('Långlopp')).getByText('• startar idag')).toBeInTheDocument();
	});

	it('folds more than three groups away behind a count, closed at first', () => {
		onPhone();
		setup([
			withGroups(
				{},
				[1, 2, 3, 4].map((n) => [10 + n, `Grupp ${n}`] as [number, string])
			)
		]);
		const summary = screen.getByText('4 grupper spelar');
		expect(summary.closest('details')).not.toHaveAttribute('open');
	});

	it('lists three groups as they are', () => {
		onPhone();
		setup([
			withGroups(
				{},
				[1, 2, 3].map((n) => [10 + n, `Grupp ${n}`] as [number, string])
			)
		]);
		expect(screen.queryByText(/grupper spelar/)).toBeNull();
		expect(screen.getByRole('link', { name: 'Grupp 3' })).toBeInTheDocument();
	});
});
