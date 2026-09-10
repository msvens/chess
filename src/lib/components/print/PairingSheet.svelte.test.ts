import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { createRawSnippet } from 'svelte';
import type { PlayerInfoDto, TournamentRoundResultDto } from '$lib/api';
import PairingSheet from './PairingSheet.svelte';

const sheetHeader = createRawSnippet(() => ({ render: () => '<header>Test Open</header>' }));

const player = (id: number, firstName: string, lastName: string, rating = 1800): PlayerInfoDto =>
	({ id, firstName, lastName, elo: { rating, k: 20 } }) as PlayerInfoDto;

const pairing = (over: Partial<TournamentRoundResultDto>): TournamentRoundResultDto =>
	({ id: 1, roundNr: 1, board: 1, homeId: 1, awayId: 2, ...over }) as TournamentRoundResultDto;

function setup(pairings: TournamentRoundResultDto[], round = 1) {
	const playerMap = new Map<number, PlayerInfoDto>([
		[1, player(1, 'Anna', 'Svensson', 2000)],
		[2, player(2, 'Bo', 'Karlsson', 1750)]
	]);
	render(PairingSheet, {
		props: {
			round,
			pairings,
			playerMap,
			rankingAlgorithm: null,
			fontPx: 13,
			sheetHeader,
			groupSuffix: ''
		}
	});
}

const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row');
const cells = (rowIndex: number) => within(bodyRows()[rowIndex]).getAllByRole('cell');

describe('PairingSheet', () => {
	it('lists the round the sheet is for, in board order', () => {
		setup([
			pairing({ id: 1, board: 3 }),
			pairing({ id: 2, board: 1 }),
			pairing({ id: 3, board: 2 })
		]);
		expect(bodyRows()).toHaveLength(3);
		expect(cells(0)[0]).toHaveTextContent('1');
		expect(cells(2)[0]).toHaveTextContent('3');
	});

	it('leaves out the other rounds', () => {
		setup([pairing({ id: 1, roundNr: 1 }), pairing({ id: 2, roundNr: 2 })], 2);
		expect(bodyRows()).toHaveLength(1);
	});

	it('treats a pairing with no round number as round one', () => {
		setup([pairing({ id: 1, roundNr: undefined })], 1);
		expect(bodyRows()).toHaveLength(1);
	});

	it('names both players and shows their ratings', () => {
		setup([pairing({})]);
		const row = cells(0);
		expect(row[1]).toHaveTextContent('Anna Svensson');
		expect(row[2]).toHaveTextContent('2000');
		expect(row[3]).toHaveTextContent('Bo Karlsson');
		expect(row[4]).toHaveTextContent('1750');
	});

	it('leaves the result blank before the game is played — the sheet is written on', () => {
		// Nil-all points is how an unplayed pairing arrives. The screen shows a
		// dash there; a sheet printed to be written on shows nothing.
		setup([pairing({ homeResult: 0, awayResult: 0 })]);
		expect(cells(0)[5].textContent).toBe('');
	});

	it('shows a played result', () => {
		setup([pairing({ homeResult: 1, awayResult: 0 })]);
		expect(cells(0)[5]).toHaveTextContent('1 - 0');
	});

	it('writes a draw as halves', () => {
		setup([pairing({ homeResult: 0.5, awayResult: 0.5 })]);
		expect(cells(0)[5]).toHaveTextContent('½ - ½');
	});

	it('writes W.O for a walkover opponent and the bye label for a bye', () => {
		setup([pairing({ id: 1, awayId: -1 }), pairing({ id: 2, board: 2, awayId: -100 })]);
		expect(cells(0)[3]).toHaveTextContent('W.O');
		expect(cells(1)[3]).toHaveTextContent('Frirond');
	});

	it('falls back to the id for a player the standings did not carry', () => {
		// Preserved from the Next app, the same stub family as the player page's
		// `Player -100`, which msvens has ruled on.
		setup([pairing({ homeId: 999 })]);
		expect(cells(0)[1]).toHaveTextContent('999');
		expect(cells(0)[2]).toHaveTextContent('');
	});

	it('titles the sheet with the round, adding the group only when asked', () => {
		setup([pairing({})], 3);
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Rond 3');
	});

	it('says so when the round has no pairings', () => {
		setup([], 4);
		expect(screen.getByText('Inga partier för denna rond')).toBeInTheDocument();
	});
});
