import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SelectableList from './SelectableList.svelte';
import type { SelectableListItem } from './listItems';

const items: SelectableListItem[] = [
	{ id: 'a', label: 'Standard' },
	{ id: 'b', label: 'Rapid' },
	{ id: 'c', label: 'Blixt', subtitle: 'Blitz' }
];

function renderDropdown(props: Partial<Record<string, unknown>> = {}) {
	const onSelect = vi.fn();
	render(SelectableList, {
		props: {
			items,
			selectedId: 'a',
			onSelect,
			variant: 'dropdown',
			placeholder: 'Välj...',
			...props
		}
	});
	return { onSelect };
}

describe('SelectableList — dropdown', () => {
	it('shows the selected item on the trigger', () => {
		renderDropdown();
		expect(screen.getByRole('button', { expanded: false })).toHaveTextContent('Standard');
	});

	it('falls back to the supplied placeholder when nothing is selected', () => {
		// The React version hardcoded 'Select an option' in English, in a
		// bilingual app. The list takes the string rather than translating it —
		// a general UI component has no business knowing the app has languages.
		renderDropdown({ selectedId: null });
		expect(screen.getByRole('button', { expanded: false })).toHaveTextContent('Välj...');
	});

	it('opens and lists the options', async () => {
		const user = userEvent.setup();
		renderDropdown();
		await user.click(screen.getByRole('button', { expanded: false }));
		expect(screen.getByRole('listbox')).toBeInTheDocument();
		expect(screen.getAllByRole('option')).toHaveLength(3);
	});

	it('marks the selected option for assistive tech', async () => {
		const user = userEvent.setup();
		renderDropdown();
		await user.click(screen.getByRole('button', { expanded: false }));
		expect(screen.getByRole('option', { name: /standard/i })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		expect(screen.getByRole('option', { name: /rapid/i })).toHaveAttribute(
			'aria-selected',
			'false'
		);
	});

	it('selects an option and closes', async () => {
		const user = userEvent.setup();
		const { onSelect } = renderDropdown();
		await user.click(screen.getByRole('button', { expanded: false }));
		await user.click(screen.getByRole('option', { name: /rapid/i }));
		expect(onSelect).toHaveBeenCalledWith('b');
		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('renders a subtitle when the item has one', async () => {
		const user = userEvent.setup();
		renderDropdown();
		await user.click(screen.getByRole('button', { expanded: false }));
		expect(screen.getByText('Blitz')).toBeInTheDocument();
	});

	it('closes on Escape', async () => {
		const user = userEvent.setup();
		renderDropdown();
		const trigger = screen.getByRole('button', { expanded: false });
		await user.click(trigger);
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
		await user.keyboard('{Escape}');
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
	});

	it('closes on a click outside', async () => {
		const user = userEvent.setup();
		renderDropdown();
		const trigger = screen.getByRole('button', { expanded: false });
		await user.click(trigger);
		await user.click(document.body);
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
	});

	it('shows a title above the trigger when given one', () => {
		renderDropdown({ title: 'Ratingtyp' });
		expect(screen.getByRole('heading', { name: 'Ratingtyp' })).toBeInTheDocument();
	});
});

describe('SelectableList — vertical', () => {
	it('renders every option inline, with no trigger', () => {
		const onSelect = vi.fn();
		render(SelectableList, {
			props: { items, selectedId: 'b', onSelect, placeholder: 'Välj...' }
		});
		expect(screen.getAllByRole('option')).toHaveLength(3);
		expect(screen.queryByRole('button', { expanded: false })).toBeNull();
	});

	it('selects on click', async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(SelectableList, {
			props: { items, selectedId: 'b', onSelect, placeholder: 'Välj...' }
		});
		await user.click(screen.getByRole('option', { name: /standard/i }));
		expect(onSelect).toHaveBeenCalledWith('a');
	});
});

describe('SelectableList — grouped items', () => {
	const grouped: SelectableListItem[] = [
		{ id: 'formats', label: 'Formats' },
		{ id: 'basics', label: 'Basics', group: 'Elo' },
		{ id: 'formula', label: 'Formula', group: 'Elo' }
	];

	it.each(['vertical', 'dropdown'] as const)(
		'%s: puts grouped items in a named group under a heading',
		async (variant) => {
			render(SelectableList, {
				props: {
					items: grouped,
					selectedId: 'formats',
					onSelect: vi.fn(),
					variant,
					placeholder: ''
				}
			});
			if (variant === 'dropdown') await userEvent.setup().click(screen.getByRole('button'));

			const group = screen.getByRole('group', { name: 'Elo' });
			expect(
				within(group)
					.getAllByRole('option')
					.map((o) => o.textContent?.trim())
			).toEqual(['Basics', 'Formula']);
			// The heading is text, not something to pick.
			expect(screen.queryByRole('option', { name: 'Elo' })).toBeNull();
			expect(screen.getByRole('option', { name: 'Formats' })).toBeInTheDocument();
		}
	);

	it('selects a grouped item', async () => {
		const onSelect = vi.fn();
		render(SelectableList, {
			props: {
				items: grouped,
				selectedId: 'formats',
				onSelect,
				variant: 'vertical',
				placeholder: ''
			}
		});
		await userEvent.setup().click(screen.getByRole('option', { name: 'Formula' }));
		expect(onSelect).toHaveBeenCalledWith('formula');
	});

	it('adds no group to a list without groups', () => {
		render(SelectableList, {
			props: { items, selectedId: 'a', onSelect: vi.fn(), variant: 'vertical', placeholder: '' }
		});
		expect(screen.queryByRole('group')).toBeNull();
		expect(screen.getAllByRole('option')).toHaveLength(3);
	});
});
