import { render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { changelog, type ChangelogEntry } from '$lib/data/changelog';
import { language } from '$lib/stores/language.svelte';
import Changelog from './Changelog.svelte';

const entries: ChangelogEntry[] = [
	{ version: 'Unreleased', date: null, sections: [] },
	{
		version: '1.2.0',
		date: '2026-08-19',
		sections: [
			{ type: 'Added', items: ['A new page', 'Another thing'] },
			{ type: 'Security', items: ['A patched hole'] }
		]
	}
];

describe('Changelog', () => {
	afterEach(() => language.set('sv'));

	it('titles the page in the current language', async () => {
		render(Changelog, { props: { entries } });
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ändringslogg');
		expect(screen.getByRole('heading', { level: 2, name: 'Ej släppt' })).toBeInTheDocument();

		language.set('en');
		await tick();
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Changelog');
		expect(screen.getByRole('heading', { level: 2, name: 'Unreleased' })).toBeInTheDocument();
	});

	it('prefixes released versions with v and shows their date', () => {
		render(Changelog, { props: { entries } });
		expect(screen.getByRole('heading', { level: 2, name: 'v1.2.0' })).toBeInTheDocument();
		expect(screen.getByText('2026-08-19')).toBeInTheDocument();
	});

	it('lists each section under its badge, with unknown types in gray', () => {
		render(Changelog, { props: { entries } });
		expect(screen.getByText('Added')).toHaveClass('bg-green-100');
		expect(screen.getByText('Security')).toHaveClass('bg-gray-100');

		const added = screen.getByText('Added').closest('div')!;
		expect(within(added).getAllByRole('listitem')).toHaveLength(2);
	});

	it('renders the real generated changelog', () => {
		// Guards the keyed each blocks: a duplicate version or section type would throw.
		render(Changelog, { props: { entries: changelog } });
		expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(changelog.length);
	});
});
