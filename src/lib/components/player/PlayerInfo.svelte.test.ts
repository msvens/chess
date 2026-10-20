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
});
