import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import QrSheet from './QrSheet.svelte';

const sheetHeader = createRawSnippet(() => ({ render: () => '<h1>Test Open</h1>' }));

describe('QrSheet', () => {
	it('shows the code, what it is for, and the address to type instead', () => {
		render(QrSheet, { path: '/results/5835/100', sheetHeader, groupSuffix: '' });
		expect(screen.getByRole('heading', { name: 'Test Open' })).toBeInTheDocument();
		expect(screen.getByRole('img')).toBeInTheDocument();
		expect(screen.getByText('Skanna för att följa resultaten')).toBeInTheDocument();
		expect(screen.getByText('chess.msvens.com/results/5835/100')).toBeInTheDocument();
	});

	it('names the group when the class has several', () => {
		render(QrSheet, { path: '/results/5835/100', sheetHeader, groupSuffix: 'Grupp A' });
		expect(screen.getByRole('heading', { level: 2, name: 'Grupp A' })).toBeInTheDocument();
	});
});
