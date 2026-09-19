import { describe, expect, it } from 'vitest';
import { RatingAlgorithm, type TournamentEndResultDto } from '$lib/api';
import { seedOrder } from './seeding';

interface PlayerShape {
	lastName: string;
	rating?: number;
	rapidRating?: number;
	blitzRating?: number;
}

const row = ({ lastName, rating, rapidRating, blitzRating }: PlayerShape): TournamentEndResultDto =>
	({
		contenderId: 1,
		place: 1000,
		points: 0,
		playerInfo: {
			id: 1,
			firstName: 'A',
			lastName,
			elo: { rating, rapidRating, blitzRating }
		}
	}) as TournamentEndResultDto;

const names = (rows: TournamentEndResultDto[]) => rows.map((r) => r.playerInfo?.lastName);

describe('seedOrder', () => {
	it('orders by the ranked rating, highest first', () => {
		const rows = [
			row({ lastName: 'Low', rating: 1400 }),
			row({ lastName: 'High', rating: 2200 }),
			row({ lastName: 'Mid', rating: 1800 })
		];
		expect(names(seedOrder(rows, RatingAlgorithm.STANDARD_ELO))).toEqual(['High', 'Mid', 'Low']);
	});

	it('uses the rating the algorithm selects, not the standard one', () => {
		// Rapid-ranked: the player with the lower standard rating seeds first.
		const rows = [
			row({ lastName: 'Slow', rating: 2000, rapidRating: 1500 }),
			row({ lastName: 'Fast', rating: 1700, rapidRating: 1900 })
		];
		expect(names(seedOrder(rows, RatingAlgorithm.RAPID_ELO))).toEqual(['Fast', 'Slow']);
	});

	it('puts unrated players last, alphabetically among themselves', () => {
		const rows = [
			row({ lastName: 'Van Der Wens' }),
			row({ lastName: 'Rated', rating: 1500 }),
			row({ lastName: 'Karasalo' }),
			row({ lastName: 'Siomin' })
		];
		expect(names(seedOrder(rows, RatingAlgorithm.STANDARD_ELO))).toEqual([
			'Rated',
			'Karasalo',
			'Siomin',
			'Van Der Wens'
		]);
	});

	it('treats a rating of 0 as unrated rather than as the lowest score', () => {
		const rows = [row({ lastName: 'Zero', rating: 0 }), row({ lastName: 'Weak', rating: 1000 })];
		expect(names(seedOrder(rows, RatingAlgorithm.STANDARD_ELO))).toEqual(['Weak', 'Zero']);
	});

	it('breaks equal ratings on last name', () => {
		const rows = [
			row({ lastName: 'Ödman', rating: 1800 }),
			row({ lastName: 'Andersson', rating: 1800 }),
			row({ lastName: 'Bergström', rating: 1800 })
		];
		// Swedish collation: Ö sorts after Z, not next to O.
		expect(names(seedOrder(rows, RatingAlgorithm.STANDARD_ELO))).toEqual([
			'Andersson',
			'Bergström',
			'Ödman'
		]);
	});

	it('falls back to the standard rating when no algorithm is given', () => {
		const rows = [
			row({ lastName: 'Lower', rating: 1500 }),
			row({ lastName: 'Higher', rating: 1900 })
		];
		expect(names(seedOrder(rows, null))).toEqual(['Higher', 'Lower']);
	});

	it.each([
		['LASK', RatingAlgorithm.LASK],
		['NO_RATING', RatingAlgorithm.NO_RATING]
	])('collapses to alphabetical under %s, which rates nobody', (_label, algorithm) => {
		const rows = [
			row({ lastName: 'Persson', rating: 2200 }),
			row({ lastName: 'Ahlberg', rating: 1400 })
		];
		// Every rating reads as null, so the tie-break decides the whole order —
		// matching the Rating column, which shows '-' for all of them.
		expect(names(seedOrder(rows, algorithm))).toEqual(['Ahlberg', 'Persson']);
	});

	it('leaves the input array untouched', () => {
		const rows = [row({ lastName: 'Low', rating: 1400 }), row({ lastName: 'High', rating: 2200 })];
		seedOrder(rows, RatingAlgorithm.STANDARD_ELO);
		expect(names(rows)).toEqual(['Low', 'High']);
	});
});
