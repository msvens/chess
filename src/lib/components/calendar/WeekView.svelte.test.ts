import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { DistrictDTO, TournamentDto } from '$lib/api';
import { ORGANIZATIONS_STATE_KEY, OrganizationsState } from '$lib/stores/organizations.svelte';
import { buildWeekRow, toDayNumber } from '$lib/utils/calendarLayout';
import { playedDays } from '$lib/utils/playedDays';
import WeekView from './WeekView.svelte';

const INDIVIDUAL = 3;

/** Tuesday 10 June 2025; its week runs Mon 9 – Sun 15. */
const ANCHOR = new Date(2025, 5, 10);
const TODAY = toDayNumber(ANCHOR);

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

const WEEKDAYS = ['mån', 'tis', 'ons', 'tors', 'fre', 'lör', 'sön'];

function setup(tournaments: TournamentDto[]) {
	render(WeekView, {
		props: {
			row: buildWeekRow(ANCHOR, tournaments.map(playedDays), TODAY),
			weekdayLabels: WEEKDAYS
		},
		context: new Map([[ORGANIZATIONS_STATE_KEY, new TestOrganizations()]])
	});
	return userEvent.setup();
}

describe('the week', () => {
	it('heads each column with its weekday and date', () => {
		setup([]);
		for (const day of WEEKDAYS) expect(screen.getByText(day)).toBeInTheDocument();
		// Mon 9 through Sun 15.
		for (const date of ['9', '10', '11', '12', '13', '14', '15']) {
			expect(screen.getByText(date)).toBeInTheDocument();
		}
	});

	it('gives each event a card', () => {
		setup([event({ id: 1, name: 'Rilton Cup' }), event({ id: 2, name: 'SM 2025' })]);
		expect(screen.getByRole('button', { name: 'Rilton Cup' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'SM 2025' })).toBeInTheDocument();
	});

	it('shows the organiser, city, type and dates on the card', () => {
		// The desktop layout; jsdom reports no match for the mobile media query.
		setup([event()]);
		expect(screen.getByText('Stockholm · Individuell')).toBeInTheDocument();
		expect(screen.getByText('Wasa SK')).toBeInTheDocument();
		expect(screen.getByText('10–12 juni')).toBeInTheDocument();
	});

	it('gives the card one action, so its title is not a second link', () => {
		setup([event()]);
		expect(screen.getByRole('button', { name: 'Rilton Cup' })).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'Rilton Cup' })).toBeNull();
	});
});

describe('an event that runs past the week', () => {
	it('marks that it continues to the right', () => {
		setup([event({ start: '2025-06-13', end: '2025-06-18' })]);
		expect(screen.getByText('▶')).toBeInTheDocument();
	});

	it('marks that it came from the left', () => {
		setup([event({ start: '2025-06-05', end: '2025-06-11' })]);
		expect(screen.getByText('◀')).toBeInTheDocument();
	});
});

describe('opening a card', () => {
	it('shows that one event, not the day', async () => {
		const user = setup([event({ id: 1, name: 'Rilton Cup' }), event({ id: 2, name: 'SM 2025' })]);
		await user.click(screen.getByRole('button', { name: 'Rilton Cup' }));

		const popover = screen.getByRole('dialog');
		expect(popover).toHaveTextContent('Rilton Cup');
		expect(popover).not.toHaveTextContent('SM 2025');
	});

	it('closes on Escape', async () => {
		const user = setup([event()]);
		await user.click(screen.getByRole('button', { name: 'Rilton Cup' }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();

		await user.keyboard('{Escape}');
		expect(screen.queryByRole('dialog')).toBeNull();
	});
});

describe('dates the organiser got wrong', () => {
	it('marks the card and says why', () => {
		setup([event({ name: 'LASK OPEN', start: '2025-06-10', end: '2025-06-02' })]);
		const warning = screen.getByLabelText('Slutdatum är före startdatum — visas på startdatumet');
		expect(warning).toHaveTextContent('⚠');
	});

	it('still prints the range as entered', () => {
		setup([event({ name: 'LASK OPEN', start: '2025-06-10', end: '2025-06-02' })]);
		expect(screen.getByText('10 juni – 2 juni')).toBeInTheDocument();
	});

	it('leaves an ordinary event unmarked', () => {
		setup([event()]);
		expect(
			screen.queryByLabelText('Slutdatum är före startdatum — visas på startdatumet')
		).toBeNull();
	});
});

describe('a league on the days it plays', () => {
	const league = (groups: [id: number, rounds: string[]][]) =>
		event({
			name: 'KM',
			start: '2025-05-01',
			end: '2025-06-30',
			rootClasses: [
				{
					classID: 1,
					className: 'KM',
					subClasses: [],
					groups: groups.map(([id, rounds]) => ({
						id,
						name: `Grupp ${id}`,
						tournamentRounds: rounds.map((roundDate) => ({ roundDate }))
					}))
				}
			] as unknown as TournamentDto['rootClasses']
		});

	it('makes the card a link to the group when only one plays', () => {
		setup([league([[10, ['2025-06-10']]])]);
		expect(screen.getByRole('link', { name: 'KM' })).toHaveAttribute('href', '/results/1/10');
	});

	it('opens the groups when several play', async () => {
		const user = setup([
			league([
				[10, ['2025-06-10']],
				[11, ['2025-06-10']]
			])
		]);
		await user.click(screen.getByRole('button', { name: 'KM' }));
		const popover = screen.getByRole('dialog');
		// The tournament itself is the popover's first link.
		expect(within(popover).getByRole('link', { name: 'KM' })).toHaveAttribute('href', '/results/1');
		expect(within(popover).getByRole('link', { name: 'Grupp 10' })).toBeInTheDocument();
		expect(within(popover).getByRole('link', { name: 'Grupp 11' })).toBeInTheDocument();
	});
});
