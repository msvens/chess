import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { PlayerInfoDto } from '$lib/api';
import PlayerInfo from './PlayerInfo.svelte';

const player = (over: Partial<PlayerInfoDto> = {}): PlayerInfoDto =>
	({
		id: 642062,
		firstName: 'Olle',
		lastName: 'Svensson',
		birthdate: '1990-01-01',
		fideid: 1234567,
		elo: { rating: 2000 },
		...over
	}) as unknown as PlayerInfoDto;

describe('PlayerInfo', () => {
	it('links the SSF Id to the member’s rating page on resultat.schack.se', () => {
		render(PlayerInfo, { props: { player: player() } });
		const link = screen.getByRole('link', { name: '642062' });
		expect(link).toHaveAttribute(
			'href',
			'https://resultat.schack.se/ViewPlayerRatingDiagram?memberid=642062'
		);
		expect(link).toHaveAttribute('target', '_blank');
	});

	it('links the FIDE Id to the FIDE profile', () => {
		render(PlayerInfo, { props: { player: player() } });
		expect(screen.getByRole('link', { name: '1234567' })).toHaveAttribute(
			'href',
			'https://ratings.fide.com/profile/1234567'
		);
	});

	it('shows each rating’s own K beside it, linking to how K works', () => {
		render(PlayerInfo, {
			props: {
				player: player({
					elo: { rating: 2410, k: 10, rapidRating: 2300, rapidk: 20, blitzRating: 2250, blitzK: 20 }
				} as Partial<PlayerInfoDto>)
			}
		});
		const ks = screen.getAllByRole('link', { name: /^K \d+$/ });
		expect(ks.map((k) => k.textContent?.trim())).toEqual(['K 10', 'K 20', 'K 20']);
		expect(ks[0]).toHaveAttribute('href', '/guide/elo/fine-print#k-factors');
	});

	it('gives no K to a time control without a rating, nor a separate K row', () => {
		render(PlayerInfo, {
			props: {
				player: player({
					elo: { rating: 1500, k: 40, rapidRating: 0, rapidk: 40 }
				} as Partial<PlayerInfoDto>)
			}
		});
		expect(screen.getAllByRole('link', { name: /^K \d+$/ })).toHaveLength(1);
		expect(screen.queryByText(/K-faktor:/)).toBeNull();
	});
});
