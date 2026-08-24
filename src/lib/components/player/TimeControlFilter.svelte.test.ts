import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TimeControlFilter, {
	type TimeControl,
	type TimeControlCounts
} from './TimeControlFilter.svelte';

const counts: TimeControlCounts = { all: 230, standard: 150, rapid: 40, blitz: 30, unrated: 10 };

function setup(selected: TimeControl = 'all', over: Partial<TimeControlCounts> = {}) {
	const onSelect = vi.fn();
	render(TimeControlFilter, { selected, onSelect, counts: { ...counts, ...over } });
	return { onSelect, user: userEvent.setup() };
}

const open = (user: ReturnType<typeof userEvent.setup>) =>
	user.click(screen.getByRole('button', { expanded: false }));

describe('the time-control filter', () => {
	it('shows what is selected, with its count', () => {
		setup();
		expect(screen.getByRole('button', { expanded: false })).toHaveTextContent('Alla (230)');
	});

	it('offers the five controls, in the domain order rather than by count', async () => {
		const { user } = setup();
		await open(user);
		expect(screen.getAllByRole('option').map((o) => o.textContent?.trim())).toEqual([
			'Alla (230)',
			'Normal (150)',
			'Snabbschack (40)',
			'Blixtschack (30)',
			'Oratade (10)'
		]);
	});

	it('reports the chosen control by key, not by label', async () => {
		const { onSelect, user } = setup();
		await open(user);
		await user.click(screen.getByRole('option', { name: 'Blixtschack (30)' }));
		expect(onSelect).toHaveBeenCalledWith('blitz');
	});

	it('shows a zero rather than hiding a control with no games', async () => {
		// The count is how a player learns they have never played blitz; dropping
		// the row would just look like a shorter menu.
		const { user } = setup('all', { rapid: 0, blitz: 0, unrated: 0 });
		await open(user);
		expect(screen.getByRole('option', { name: 'Blixtschack (0)' })).toBeInTheDocument();
	});

	it('marks the current control for assistive tech', async () => {
		const { user } = setup('rapid');
		await open(user);
		expect(screen.getByRole('option', { name: 'Snabbschack (40)' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
	});
});
