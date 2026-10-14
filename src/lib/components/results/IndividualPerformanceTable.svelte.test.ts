import { render, screen, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import type { IndividualPerformanceRow, PlayerInfoDto } from '$lib/api';
import { language } from '$lib/stores/language.svelte';
import IndividualPerformanceTable from './IndividualPerformanceTable.svelte';

const row = (over: Partial<IndividualPerformanceRow>): IndividualPerformanceRow => ({
	playerId: 1,
	groupId: 10,
	games: 5,
	won: 3,
	drawn: 1,
	lost: 1,
	points: 3.5,
	ratedGames: 5,
	performance: 1800,
	...over
});

const players: Record<number, PlayerInfoDto> = {
	1: { id: 1, firstName: 'Anna', lastName: 'Svensson', club: 'SK Rockaden' } as PlayerInfoDto,
	2: { id: 2, firstName: 'Bo', lastName: 'Karlsson', club: 'Lunds ASK' } as PlayerInfoDto
};

function setup(rows: IndividualPerformanceRow[]) {
	render(IndividualPerformanceTable, {
		props: {
			rows,
			tournamentId: 7004,
			playerOf: (id: number) => players[id],
			clubOf: (id: number) => players[id]?.club
		}
	});
}

const cells = (index: number) =>
	within(screen.getAllByRole('row')[index + 1])
		.getAllByRole('cell')
		.map((cell) => cell.textContent?.trim());

beforeEach(() => language.set('sv'));

describe('IndividualPerformanceTable', () => {
	it('shows the official columns in order', () => {
		setup([row({})]);
		const headers = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim());
		expect(headers).toEqual(['Plac', 'Namn', 'Klubb', 'SP', '+', '=', '-', 'P', 'Perf']);
		expect(cells(0)).toEqual([
			'1',
			'Anna Svensson',
			'SK Rockaden',
			'5',
			'3',
			'1',
			'1',
			'3.5',
			'1800'
		]);
	});

	it('ranks in list order and shows a dash for no performance', () => {
		setup([row({}), row({ playerId: 2, performance: null })]);
		expect(cells(1)[0]).toBe('2');
		expect(cells(1)[8]).toBe('-');
	});

	it('links a name to the player’s games in their group', () => {
		setup([row({ groupId: 18962 })]);
		expect(screen.getByRole('link', { name: 'Anna Svensson' })).toHaveAttribute(
			'href',
			'/results/7004/18962/1'
		);
	});
});
