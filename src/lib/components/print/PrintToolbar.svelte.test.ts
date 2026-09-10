import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PrintToolbar from './PrintToolbar.svelte';

const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => goto(...args) }));

const CLASSES = [
	{ id: 1, label: 'Elit', firstGroupId: 100 },
	{ id: 2, label: 'Motion', firstGroupId: 200 }
];

const GROUPS = [
	{ id: 100, label: 'A' },
	{ id: 101, label: 'B' }
];

function setup(over: Record<string, unknown> = {}) {
	const handlers = {
		onRoundChange: vi.fn(),
		onFontModeChange: vi.fn(),
		onAutoChange: vi.fn(),
		onAllGroupsChange: vi.fn()
	};
	render(PrintToolbar, {
		props: {
			rounds: [1, 2, 3],
			selectedRound: 3,
			fontMode: 'medium',
			auto: true,
			allGroups: false,
			classOptions: CLASSES,
			currentClassId: 1,
			groupOptions: GROUPS,
			groupId: 100,
			tournamentId: 5835,
			...handlers,
			...over
		}
	});
	return { ...handlers, user: userEvent.setup() };
}

/** The dropdown triggers, in toolbar order: class, group, round. */
const triggers = () => screen.getAllByRole('button', { expanded: false });

describe('PrintToolbar', () => {
	beforeEach(() => goto.mockReset());

	it('links back to the group it was opened from', () => {
		setup();
		expect(screen.getByRole('link')).toHaveAttribute('href', '/results/5835/100');
	});

	it('jumps to a class first group when a class is picked', async () => {
		const { user } = setup();
		await user.click(triggers()[0]);
		await user.click(screen.getByRole('option', { name: 'Motion' }));
		expect(goto).toHaveBeenCalledWith('/print/5835/200');
	});

	it('navigates to a group within the class', async () => {
		const { user } = setup();
		await user.click(triggers()[1]);
		await user.click(screen.getByRole('option', { name: 'B' }));
		expect(goto).toHaveBeenCalledWith('/print/5835/101');
	});

	it('reports a round change rather than navigating', async () => {
		const { onRoundChange, user } = setup();
		await user.click(triggers()[2]);
		await user.click(screen.getByRole('option', { name: 'Rond 1' }));
		expect(onRoundChange).toHaveBeenCalledWith(1);
		expect(goto).not.toHaveBeenCalled();
	});

	it('hides the round picker for a single-round event', () => {
		setup({ rounds: [1], selectedRound: 1 });
		expect(screen.queryByText('Rond 1')).toBeNull();
	});

	it('hides the class and group pickers while all groups are being printed', () => {
		setup({ allGroups: true });
		expect(triggers()).toHaveLength(1); // the round picker alone
	});

	it('offers the all-groups toggle only when there is more than one group', () => {
		const { onAllGroupsChange } = setup();
		expect(screen.getByRole('checkbox', { name: 'Alla grupper' })).toBeInTheDocument();
		expect(onAllGroupsChange).not.toHaveBeenCalled();

		render(PrintToolbar, {
			props: {
				rounds: [1],
				selectedRound: 1,
				onRoundChange: vi.fn(),
				fontMode: 'medium',
				onFontModeChange: vi.fn(),
				auto: true,
				onAutoChange: vi.fn(),
				allGroups: false,
				onAllGroupsChange: vi.fn(),
				classOptions: [CLASSES[0]],
				currentClassId: 1,
				groupOptions: [GROUPS[0]],
				groupId: 100,
				tournamentId: 5835
			}
		});
		expect(screen.getAllByRole('checkbox', { name: 'Alla grupper' })).toHaveLength(1);
	});

	it('marks the chosen font size and reports a change', async () => {
		const { onFontModeChange, user } = setup();
		const sizes = within(screen.getByRole('group', { name: 'Textstorlek' })).getAllByRole('button');
		expect(sizes[1]).toHaveAttribute('aria-pressed', 'true');

		await user.click(sizes[2]);
		expect(onFontModeChange).toHaveBeenCalledWith('large');
	});

	it('reports the auto-fit toggle', async () => {
		const { onAutoChange, user } = setup();
		await user.click(screen.getByRole('checkbox', { name: 'Autoanpassa' }));
		expect(onAutoChange).toHaveBeenCalledWith(false);
	});

	it('prints, and says it can save a PDF too', async () => {
		const print = vi.fn();
		vi.stubGlobal('print', print);
		const { user } = setup();

		const action = screen.getByRole('button', { name: 'Skriv ut' });
		expect(action).toHaveAttribute('title', 'Skriv ut / spara som PDF');
		await user.click(action);
		expect(print).toHaveBeenCalled();
		vi.unstubAllGlobals();
	});
});
