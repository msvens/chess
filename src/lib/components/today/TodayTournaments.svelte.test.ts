import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { TournamentDto } from '$lib/api';
import type { PlayedEntry } from '$lib/utils/playedDays';
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
		tournament: {
			id,
			name,
			start: '2026-11-25',
			end: '2026-11-25',
			city: 'Stockholm',
			orgType: 1,
			orgNumber: 1,
			rootClasses
		} as unknown as TournamentDto,
		groups: rootClasses.map(({ groups: [group] }) => group)
	} as unknown as PlayedEntry;
};

const tournament = (id: number, name: string, groupName?: string) =>
	withClasses(id, name, groupName ? [['Klass', groupName]] : []);

function setup(props: { tournaments: PlayedEntry[]; loading?: boolean; error?: string }) {
	render(TodayTournaments, {
		props,
		context: new Map([[ORGANIZATIONS_STATE_KEY, new OrganizationsState()]])
	});
}

/*
 * The rows themselves are the calendar's day list, tested in `DayView`. What is
 * this component's own: the states around it, and that it is that list.
 */
describe('today’s tournaments', () => {
	it('is the calendar’s day list: the tournament as a heading, its groups as links', () => {
		setup({ tournaments: [tournament(5, 'Farsta JGP', 'Grupp A')] });
		expect(screen.getByRole('heading', { name: 'Farsta JGP' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Grupp A' })).toHaveAttribute('href', '/results/5/50');
	});

	it('sorts by name, Swedish style', () => {
		setup({ tournaments: [tournament(1, 'Örebro Open'), tournament(2, 'Aros Cup')] });
		expect(screen.getAllByRole('heading').map((h) => h.textContent?.trim())).toEqual([
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
