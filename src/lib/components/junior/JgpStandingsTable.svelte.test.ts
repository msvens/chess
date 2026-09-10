import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { JgpTournamentRef } from '$lib/data/jgp/types';
import type { JgpAgeClassTable, JgpStandingRow } from '$lib/junior/jgpEngine';
import JgpStandingsTable from './JgpStandingsTable.svelte';

const tournament = (tournamentId: number, label: string): JgpTournamentRef =>
	({ tournamentId, label, shortLabel: label, date: '2026-03-07', groups: [] }) as JgpTournamentRef;

const tournaments = [tournament(6544, 'Tyresö JGP 2026'), tournament(6540, 'Trojanska Hästen')];

const row = (over: Partial<JgpStandingRow> = {}): JgpStandingRow => ({
	memberId: 1,
	name: 'Anna Svensson',
	birthYear: 2013,
	clubName: 'SK Rockaden',
	perTournament: [25, 22],
	total: 47,
	played: 2,
	place: 1,
	...over
});

const table = (rows: JgpStandingRow[]): JgpAgeClassTable => ({
	ageClass: { label: '2013', fromYear: 2013, toYear: 2013 },
	rows
});

const setup = (rows: JgpStandingRow[]) =>
	render(JgpStandingsTable, { props: { table: table(rows), tournaments } });

const headerCells = () => within(screen.getAllByRole('rowgroup')[0]).getAllByRole('columnheader');

describe('JgpStandingsTable', () => {
	it('numbers the tournament columns and links each to its results', () => {
		setup([row()]);
		const first = screen.getByRole('link', { name: '1' });
		expect(first).toHaveAttribute('href', '/results/6544');
		// The number alone says nothing; the full name is the tooltip, and the
		// legend beside the table spells it out.
		expect(first).toHaveAttribute('title', 'Tyresö JGP 2026');
		expect(screen.getByRole('link', { name: '2' })).toHaveAttribute('href', '/results/6540');
	});

	it('lays the columns out as identity, then a column per tournament, then the total', () => {
		setup([row()]);
		expect(headerCells().map((cell) => cell.textContent?.trim())).toEqual([
			'#',
			'Namn',
			'Född',
			'Klubb',
			'1',
			'2',
			'Totalt'
		]);
	});

	it('links each player to their profile', () => {
		setup([row({ memberId: 408550 })]);
		expect(screen.getByRole('link', { name: 'Anna Svensson' })).toHaveAttribute(
			'href',
			'/players/408550'
		);
	});

	it('shows whole scores plain and halves to one decimal', () => {
		setup([row({ perTournament: [25, 12.5], total: 37.5 })]);
		expect(screen.getByText('25')).toBeInTheDocument();
		expect(screen.getByText('12.5')).toBeInTheDocument();
		expect(screen.getByText('37.5')).toBeInTheDocument();
	});

	it('leaves a tournament the player did not score in blank', () => {
		setup([row({ perTournament: [25, null], total: 25 })]);
		const cells = within(screen.getAllByRole('rowgroup')[1]).getAllByRole('cell');
		// pos, name, born, club, t1, t2, total
		expect(cells[5]).toHaveTextContent('');
	});

	it('rules off after the A-final and B-final cut-offs', () => {
		const rows = Array.from({ length: 25 }, (_, i) =>
			row({ memberId: i + 1, name: `Player ${i + 1}`, place: i + 1 })
		);
		setup(rows);
		const bodyRows = within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row');
		const heavy = (index: number) => bodyRows[index].className.includes('border-b-2');

		expect(heavy(9)).toBe(true);
		expect(heavy(19)).toBe(true);
		expect(heavy(0)).toBe(false);
		expect(heavy(10)).toBe(false);
	});

	it('says so when nobody has scored', () => {
		setup([]);
		expect(
			screen.getByText('Ingen ställning tillgänglig för den här säsongen.')
		).toBeInTheDocument();
	});
});
