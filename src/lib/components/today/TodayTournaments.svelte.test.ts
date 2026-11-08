import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { TournamentDto } from '$lib/api';
import { ORGANIZATIONS_STATE_KEY, OrganizationsState } from '$lib/stores/organizations.svelte';
import TodayTournaments from './TodayTournaments.svelte';

const pad = (n: number) => String(n).padStart(2, '0');
const now = new Date();
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

const tournament = (id: number, name: string, groupName?: string) =>
	({
		id,
		name,
		city: 'Stockholm',
		orgType: 1,
		orgNumber: 1,
		rootClasses: groupName
			? [
					{
						classID: 1,
						className: 'Klass',
						groups: [{ id: id * 10, name: groupName, start: today, end: today }]
					}
				]
			: []
	}) as unknown as TournamentDto;

function setup(props: { tournaments: TournamentDto[]; loading?: boolean; error?: string }) {
	render(TodayTournaments, {
		props,
		context: new Map([[ORGANIZATIONS_STATE_KEY, new OrganizationsState()]])
	});
}

describe('today’s tournaments', () => {
	it('links the tournament and the groups playing', () => {
		setup({ tournaments: [tournament(5, 'Farsta JGP', 'Klass F')] });
		expect(screen.getByRole('link', { name: 'Farsta JGP' })).toHaveAttribute('href', '/results/5');
		expect(screen.getByRole('link', { name: 'Klass F' })).toHaveAttribute('href', '/results/5/50');
		expect(screen.getByText('Stockholm')).toBeInTheDocument();
	});

	it('shows only the tournament link when no group can be placed today', () => {
		setup({ tournaments: [tournament(5, 'Farsta JGP')] });
		expect(screen.getAllByRole('link')).toHaveLength(1);
	});

	it('sorts by name', () => {
		setup({ tournaments: [tournament(1, 'Örebro Open'), tournament(2, 'Aros Cup')] });
		expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
			'Aros Cup',
			'Örebro Open'
		]);
	});

	it('says when nothing is being played', () => {
		setup({ tournaments: [] });
		expect(screen.getByText('Inga turneringar hittades för idag.')).toBeInTheDocument();
	});

	it('prefers loading over the empty message', () => {
		setup({ tournaments: [], loading: true });
		expect(screen.queryByText('Inga turneringar hittades för idag.')).toBeNull();
	});

	it('shows an error', () => {
		setup({ tournaments: [], error: 'Fel' });
		expect(screen.getByText('Fel')).toBeInTheDocument();
	});
});
