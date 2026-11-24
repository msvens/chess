import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { TournamentDto } from '$lib/api';
import { buildMonthMatrix, buildWeekCells, toDayNumber } from '$lib/utils/calendarLayout';
import { playedDays } from '$lib/utils/playedDays';
import AgendaPicker from './AgendaPicker.svelte';

const ALLSVENSKAN = 2;
const INDIVIDUAL = 3;
const SM_TREE = 4;
const SCHOOL_SM = 5;

/** Wednesday 11 June 2025, today in every test. */
const TODAY = new Date(2025, 5, 11);
const WEEKDAYS = ['mån', 'tis', 'ons', 'tors', 'fre', 'lör', 'sön'];

const event = (id: number, type: number, day: string): TournamentDto =>
	({ id, name: `T${id}`, type, start: day, end: day }) as TournamentDto;

function setup(
	tournaments: TournamentDto[],
	{ week = false, selected = TODAY }: { week?: boolean; selected?: Date } = {}
) {
	const onSelect = vi.fn();
	const today = toDayNumber(TODAY);
	render(AgendaPicker, {
		props: {
			rows: week ? [buildWeekCells(TODAY, today)] : buildMonthMatrix(TODAY, today),
			events: tournaments.map(playedDays),
			selectedDay: toDayNumber(selected),
			onSelect,
			weekdayLabels: WEEKDAYS
		}
	});
	return { user: userEvent.setup(), onSelect };
}

const day = (name: RegExp) => screen.getByRole('button', { name });
const dots = (button: HTMLElement) => button.querySelectorAll('[aria-hidden="true"] > span');

describe('the month', () => {
	it('has a button per day, six weeks of them', () => {
		setup([]);
		expect(screen.getAllByRole('button')).toHaveLength(42);
	});

	it('names how many events a day holds', () => {
		setup([event(1, INDIVIDUAL, '2025-06-14'), event(2, ALLSVENSKAN, '2025-06-14')]);
		expect(day(/2 evenemang den .*14 juni/)).toBeInTheDocument();
	});

	it('dots a day once per type, in the colour key’s order', () => {
		setup([
			event(1, INDIVIDUAL, '2025-06-14'),
			event(2, INDIVIDUAL, '2025-06-14'),
			event(3, ALLSVENSKAN, '2025-06-14')
		]);
		const classes = [...dots(day(/evenemang den .*14 juni/))].map((dot) => dot.className);
		expect(classes).toHaveLength(2);
		expect(classes[0]).toContain('bg-blue-500'); // Allsvenskan first
		expect(classes[1]).toContain('bg-emerald-500');
	});

	it('shows at most three dots', () => {
		setup(
			[ALLSVENSKAN, INDIVIDUAL, SM_TREE, SCHOOL_SM].map((type, i) =>
				event(i + 1, type, '2025-06-14')
			)
		);
		expect(dots(day(/4 evenemang den .*14 juni/))).toHaveLength(3);
	});

	it('marks the selected day', () => {
		setup([], { selected: new Date(2025, 5, 20) });
		expect(day(/20 juni/)).toHaveAttribute('aria-pressed', 'true');
		expect(day(/11 juni/)).toHaveAttribute('aria-pressed', 'false');
	});

	it('hands the picked day back, padding days included', async () => {
		const { user, onSelect } = setup([]);
		await user.click(day(/1 juli/));
		expect(onSelect).toHaveBeenCalledWith(new Date(2025, 6, 1));
	});
});

describe('the week strip', () => {
	it('is seven days, each named', () => {
		setup([], { week: true });
		expect(screen.getAllByRole('button')).toHaveLength(7);
		for (const weekday of WEEKDAYS) expect(screen.getByText(weekday)).toBeInTheDocument();
	});
});
