import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { DistrictDTO, TournamentDto } from '$lib/api';
import { ORGANIZATIONS_STATE_KEY, OrganizationsState } from '$lib/stores/organizations.svelte';
import { buildMonthRows, toDayNumber } from '$lib/utils/calendarLayout';
import MonthView from './MonthView.svelte';

const INDIVIDUAL = 3;

/** June 2025 — a month whose 1st is a Sunday, so the grid pads on both sides. */
const ANCHOR = new Date(2025, 5, 15);
const TODAY = toDayNumber(new Date(2025, 5, 15));

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
	render(MonthView, {
		props: {
			rows: buildMonthRows(ANCHOR, tournaments, TODAY),
			tournaments,
			weekdayLabels: WEEKDAYS
		},
		context: new Map([[ORGANIZATIONS_STATE_KEY, new TestOrganizations()]])
	});
	return userEvent.setup();
}

describe('the grid', () => {
	it('heads each column with its weekday', () => {
		setup([]);
		for (const day of WEEKDAYS) expect(screen.getByText(day)).toBeInTheDocument();
	});

	it('draws a bar per event', () => {
		setup([event({ id: 1, name: 'Rilton Cup' }), event({ id: 2, name: 'SM 2025' })]);
		expect(screen.getByRole('button', { name: /Rilton Cup/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /SM 2025/ })).toBeInTheDocument();
	});

	it('marks a long event with a dot rather than spanning it', () => {
		// Over a week, so `calendarLayout` renders a start-only marker. 56 of the
		// 137 live tournaments are like this.
		setup([event({ start: '2025-06-02', end: '2025-06-20' })]);
		expect(screen.getByRole('button', { name: /Rilton Cup/ })).toHaveTextContent('•');
	});
});

describe('opening a day', () => {
	it('gives every day with events a named button', () => {
		setup([event({ start: '2025-06-10', end: '2025-06-10' })]);
		// "N events on <date>" — the cells carry no date text of their own.
		expect(screen.getByRole('button', { name: /1 evenemang den .*10 juni/ })).toBeInTheDocument();
	});

	it('leaves an empty day with no button at all', () => {
		setup([event({ start: '2025-06-10', end: '2025-06-10' })]);
		expect(screen.queryByRole('button', { name: /evenemang den .*11 juni/ })).toBeNull();
	});

	it('opens the whole day when the cell is clicked', async () => {
		const user = setup([
			event({ id: 1, name: 'Rilton Cup', start: '2025-06-10', end: '2025-06-10' }),
			event({ id: 2, name: 'SM 2025', start: '2025-06-10', end: '2025-06-10' })
		]);
		await user.click(screen.getByRole('button', { name: /2 evenemang den .*10 juni/ }));

		const popover = screen.getByRole('dialog');
		expect(popover).toHaveTextContent('Rilton Cup');
		expect(popover).toHaveTextContent('SM 2025');
	});

	it('opens just one event when its bar is clicked', async () => {
		const user = setup([
			event({ id: 1, name: 'Rilton Cup', start: '2025-06-10', end: '2025-06-10' }),
			event({ id: 2, name: 'SM 2025', start: '2025-06-10', end: '2025-06-10' })
		]);
		await user.click(screen.getByRole('button', { name: /^Rilton Cup/ }));

		const popover = screen.getByRole('dialog');
		expect(popover).toHaveTextContent('Rilton Cup');
		expect(popover).not.toHaveTextContent('SM 2025');
	});

	it('closes on Escape', async () => {
		const user = setup([event({ start: '2025-06-10', end: '2025-06-10' })]);
		await user.click(screen.getByRole('button', { name: /1 evenemang/ }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();

		await user.keyboard('{Escape}');
		expect(screen.queryByRole('dialog')).toBeNull();
	});
});

describe('more events than lanes', () => {
	it('offers a "+N more" control', () => {
		// Four events on one day, three lanes drawn.
		const day = { start: '2025-06-10', end: '2025-06-10' };
		setup([1, 2, 3, 4].map((id) => event({ ...day, id, name: `Event ${id}` })));
		expect(screen.getByRole('button', { name: '+1 fler' })).toBeInTheDocument();
	});

	it('opens the whole day from it, not just the hidden ones', async () => {
		const day = { start: '2025-06-10', end: '2025-06-10' };
		const user = setup([1, 2, 3, 4].map((id) => event({ ...day, id, name: `Event ${id}` })));
		await user.click(screen.getByRole('button', { name: '+1 fler' }));

		const popover = screen.getByRole('dialog');
		for (const id of [1, 2, 3, 4]) expect(popover).toHaveTextContent(`Event ${id}`);
	});

	it('offers nothing when everything fits', () => {
		const day = { start: '2025-06-10', end: '2025-06-10' };
		setup([1, 2, 3].map((id) => event({ ...day, id, name: `Event ${id}` })));
		expect(screen.queryByRole('button', { name: /fler/ })).toBeNull();
	});
});

describe('dates the organiser got wrong', () => {
	it('marks the bar, so where it sits reads as a guess', async () => {
		// LASK OPEN 2026's shape: end before start. The layout engine draws it on
		// the start date; the app must not present that as fact.
		setup([event({ name: 'LASK OPEN', start: '2025-06-10', end: '2025-06-02' })]);
		const bar = screen.getByRole('button', { name: /LASK OPEN/ });
		expect(bar).toHaveTextContent('⚠');
		expect(bar.title).toContain('Slutdatum är före startdatum');
	});

	it('marks the range in the popover too, without repairing it', async () => {
		const user = setup([event({ name: 'LASK OPEN', start: '2025-06-10', end: '2025-06-02' })]);
		await user.click(screen.getByRole('button', { name: /^LASK OPEN/ }));

		const popover = screen.getByRole('dialog');
		expect(popover).toHaveTextContent('10 juni 2025 – 2 juni 2025');
		expect(popover).toHaveTextContent('⚠');
	});

	it('leaves an ordinary event unmarked', () => {
		setup([event()]);
		expect(screen.getByRole('button', { name: /Rilton Cup/ })).not.toHaveTextContent('⚠');
	});
});
