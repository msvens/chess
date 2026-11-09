import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { TournamentToday } from '$lib/api';
import { ORGANIZATIONS_STATE_KEY, OrganizationsState } from '$lib/stores/organizations.svelte';
import TodayTournaments from './TodayTournaments.svelte';

/** Each class holds one group, and every group is playing today. */
const withClasses = (id: number, name: string, classes: [className: string, group: string][]) => {
	const rootClasses = classes.map(([className, groupName], i) => ({
		classID: i + 1,
		className,
		groups: [{ id: id * 10 + i, name: groupName }]
	}));
	return {
		id,
		name,
		city: 'Stockholm',
		orgType: 1,
		orgNumber: 1,
		rootClasses,
		groupsToday: rootClasses.map(({ groups: [group] }) => ({ group, rounds: [] }))
	} as unknown as TournamentToday;
};

const tournament = (id: number, name: string, groupName?: string) =>
	withClasses(id, name, groupName ? [['Klass', groupName]] : []);

function setup(props: { tournaments: TournamentToday[]; loading?: boolean; error?: string }) {
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

	it('names the class only when the event has more than one', () => {
		const event = withClasses(5, 'Rilton Cup', [
			['Elit', 'Grupp 1'],
			['Open', 'Grupp 1']
		]);
		setup({ tournaments: [event] });
		expect(screen.getByRole('link', { name: 'Elit, Grupp 1' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Open, Grupp 1' })).toBeInTheDocument();
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
