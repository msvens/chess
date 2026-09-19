import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { createRawSnippet } from 'svelte';
import { NO_PLACE, RatingAlgorithm, type TournamentEndResultDto } from '$lib/api';
import StandingsSheet from './StandingsSheet.svelte';

const sheetHeader = createRawSnippet(() => ({ render: () => '<header>Test Open</header>' }));

const entry = (over: Partial<TournamentEndResultDto>): TournamentEndResultDto =>
	({
		contenderId: 1,
		place: 1,
		points: 5,
		secPoints: 27.5,
		playerInfo: { id: 1, firstName: 'Anna', lastName: 'Svensson' },
		...over
	}) as TournamentEndResultDto;

const setup = (standings: TournamentEndResultDto[], groupSuffix = '') =>
	render(StandingsSheet, { props: { standings, fontPx: 13, sheetHeader, groupSuffix } });

const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row');
const cells = (rowIndex: number) => within(bodyRows()[rowIndex]).getAllByRole('cell');

describe('StandingsSheet', () => {
	it('orders by place, whatever order the rows arrived in', () => {
		setup([
			entry({ contenderId: 3, place: 3 }),
			entry({ contenderId: 1, place: 1 }),
			entry({ contenderId: 2, place: 2 })
		]);
		expect(bodyRows().map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual([
			'1',
			'2',
			'3'
		]);
	});

	it('shows rank, name, points and tiebreak', () => {
		setup([entry({})]);
		const row = cells(0);
		expect(row[0]).toHaveTextContent('1');
		expect(row[1]).toHaveTextContent('Anna Svensson');
		expect(row[2]).toHaveTextContent('5');
		expect(row[3]).toHaveTextContent('27.5');
	});

	it('prints the tiebreak to one decimal, so the column lines up', () => {
		setup([entry({ secPoints: 27 })]);
		expect(cells(0)[3]).toHaveTextContent('27.0');
	});

	it('falls back to the contender id when no player came with the row', () => {
		setup([entry({ contenderId: 408550, playerInfo: undefined })]);
		expect(cells(0)[1]).toHaveTextContent('408550');
	});

	it('appends the group to the title only when there is one to append', () => {
		setup([entry({})]);
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Ställning');
	});

	it('names the group when the class has several', () => {
		setup([entry({})], 'Grupp B');
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Ställning – Grupp B');
	});

	it('says so when there are no standings', () => {
		setup([]);
		expect(screen.getByText('Ingen ställning tillgänglig')).toBeInTheDocument();
	});
});

describe('StandingsSheet before a group has standings', () => {
	const unplaced = (contenderId: number, lastName: string, rating?: number) =>
		({
			contenderId,
			place: NO_PLACE,
			points: 0,
			secPoints: 0,
			playerInfo: { id: contenderId, firstName: 'A', lastName, elo: { rating } }
		}) as TournamentEndResultDto;

	const seededSetup = (standings: TournamentEndResultDto[]) =>
		render(StandingsSheet, {
			props: {
				standings,
				fontPx: 13,
				sheetHeader,
				groupSuffix: '',
				rankingAlgorithm: RatingAlgorithm.STANDARD_ELO
			}
		});

	it('prints a start list seeded by rating instead of the API order', () => {
		seededSetup([
			unplaced(1, 'Weak', 1200),
			unplaced(2, 'Strong', 2400),
			unplaced(3, 'Middling', 1800)
		]);
		expect(bodyRows().map((r) => within(r).getAllByRole('cell')[1].textContent?.trim())).toEqual([
			'A Strong',
			'A Middling',
			'A Weak'
		]);
	});

	it('numbers the start list by seed position, never printing the sentinel', () => {
		seededSetup([unplaced(1, 'Weak', 1200), unplaced(2, 'Strong', 2400)]);
		expect(bodyRows().map((r) => within(r).getAllByRole('cell')[0].textContent?.trim())).toEqual([
			'1',
			'2'
		]);
		expect(screen.queryByText(String(NO_PLACE))).not.toBeInTheDocument();
	});

	it('puts unrated players last', () => {
		seededSetup([unplaced(1, 'Unrated'), unplaced(2, 'Rated', 1500)]);
		expect(bodyRows().map((r) => within(r).getAllByRole('cell')[1].textContent?.trim())).toEqual([
			'A Rated',
			'A Unrated'
		]);
	});
});
