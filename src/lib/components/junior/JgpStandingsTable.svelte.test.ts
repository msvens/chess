import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { JgpStandingRow, JgpTable } from '$lib/api/sthlm';
import type { JgpTournament } from '$lib/stores/jgpStandings.svelte';
import JgpStandingsTable from './JgpStandingsTable.svelte';

const tournament = (id: number, name: string): JgpTournament => ({ id, name, date: '2026-03-07' });

const tournaments = [tournament(6544, 'Tyresö JGP 2026'), tournament(6540, 'Trojanska Hästen')];

const row = (over: Partial<JgpStandingRow> = {}): JgpStandingRow => ({
	placement: 1,
	memberId: 1,
	name: 'Anna Svensson',
	birthYear: 2013,
	club: 'SK Rockaden',
	points: { 6544: 25, 6540: 22 },
	total: 47,
	...over
});

const table = (rows: JgpStandingRow[]): JgpTable => ({ label: '2013', rows });

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
		setup([row({ points: { 6544: 25, 6540: 12.5 }, total: 37.5 })]);
		expect(screen.getByText('25')).toBeInTheDocument();
		expect(screen.getByText('12.5')).toBeInTheDocument();
		expect(screen.getByText('37.5')).toBeInTheDocument();
	});

	it('leaves a tournament the player did not play blank, but shows a 0 as 0', () => {
		// A 0 is a game in the wrong class without dispensation — not the same as absent.
		setup([row({ points: { 6540: 0 }, total: 0 })]);
		const cells = within(screen.getAllByRole('rowgroup')[1]).getAllByRole('cell');
		// pos, name, born, club, t1, t2, total
		expect(cells[4]).toHaveTextContent(/^$/);
		expect(cells[5]).toHaveTextContent('0');
	});

	it('says so when nobody has scored', () => {
		setup([]);
		expect(
			screen.getByText('Ingen ställning tillgänglig för den här säsongen.')
		).toBeInTheDocument();
	});
});
