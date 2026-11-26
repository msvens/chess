import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ChipGroup from './ChipGroup.svelte';

const items = [
	{ id: 'standard', label: 'Standard' },
	{ id: 'rapid', label: 'Snabb' },
	{ id: 'blitz', label: 'Blixt' }
];

describe('ChipGroup', () => {
	it('is a named group with the chosen chip pressed', () => {
		render(ChipGroup, { items, selectedId: 'rapid', onSelect: () => {}, label: 'Ratingtyp' });
		expect(screen.getByRole('group', { name: 'Ratingtyp' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Snabb' })).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByRole('button', { name: 'Blixt' })).toHaveAttribute('aria-pressed', 'false');
	});

	it('reports the chip picked', async () => {
		const onSelect = vi.fn();
		render(ChipGroup, { items, selectedId: 'standard', onSelect, label: 'Ratingtyp' });
		await userEvent.click(screen.getByRole('button', { name: 'Blixt' }));
		expect(onSelect).toHaveBeenCalledWith('blitz');
	});
});
