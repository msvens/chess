import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SearchableSelectableList from './SearchableSelectableList.svelte';
import type { SelectableListItem } from './selectableListLogic';

const items: SelectableListItem[] = [
	{ id: 1, label: 'Stockholms Schacksällskap', subtitle: 'Stockholm' },
	{ id: 2, label: 'Malmö AS', subtitle: 'Malmö' },
	{ id: 3, label: 'Wasa SK', subtitle: 'Göteborg' }
];

function setup(props: Record<string, unknown> = {}) {
	const onSelect = vi.fn();
	render(SearchableSelectableList, { props: { items, selectedId: null, onSelect, ...props } });
	return { onSelect, user: userEvent.setup() };
}

const openPanel = async (user: ReturnType<typeof userEvent.setup>) => {
	await user.click(screen.getByRole('button', { expanded: false }));
};

describe('SearchableSelectableList', () => {
	it('shows a translated placeholder until something is selected', () => {
		setup();
		expect(screen.getByRole('button', { expanded: false })).toHaveTextContent('Välj...');
	});

	it('opens with a filter box and every option', async () => {
		const { user } = setup();
		await openPanel(user);
		expect(screen.getByRole('textbox')).toBeInTheDocument();
		expect(screen.getAllByRole('option')).toHaveLength(3);
	});

	it('focuses the filter box on open, so you can type straight away', async () => {
		const { user } = setup();
		await openPanel(user);
		expect(screen.getByRole('textbox')).toHaveFocus();
	});

	it('filters on label', async () => {
		const { user } = setup();
		await openPanel(user);
		await user.type(screen.getByRole('textbox'), 'wasa');
		expect(screen.getAllByRole('option')).toHaveLength(1);
	});

	it('filters on subtitle too, since that is the city', async () => {
		const { user } = setup();
		await openPanel(user);
		await user.type(screen.getByRole('textbox'), 'göteborg');
		expect(screen.getAllByRole('option')).toHaveLength(1);
	});

	it('shows a translated empty state, not an empty panel', async () => {
		const { user } = setup();
		await openPanel(user);
		await user.type(screen.getByRole('textbox'), 'zzzz');
		expect(screen.queryAllByRole('option')).toHaveLength(0);
		expect(screen.getByText('Inga träffar')).toBeInTheDocument();
	});

	it('shows a translated match count only while filtering', async () => {
		const { user } = setup();
		await openPanel(user);
		expect(screen.queryByText(/av 3/)).toBeNull();
		await user.type(screen.getByRole('textbox'), 'a');
		expect(screen.getByText(/av 3/)).toBeInTheDocument();
	});

	it('selects an option, closes, and clears the filter for next time', async () => {
		const { user, onSelect } = setup();
		await openPanel(user);
		await user.type(screen.getByRole('textbox'), 'wasa');
		await user.click(screen.getByRole('option', { name: /wasa/i }));
		expect(onSelect).toHaveBeenCalledWith(3);

		await openPanel(user);
		expect(screen.getByRole('textbox')).toHaveValue('');
		expect(screen.getAllByRole('option')).toHaveLength(3);
	});

	it('closes on Escape', async () => {
		const { user } = setup();
		await openPanel(user);
		await user.keyboard('{Escape}');
		expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
	});
});
