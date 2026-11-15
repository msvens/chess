import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
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

	it('lists up to three groups one per line, with no heading to open', () => {
		const event = withClasses(5, 'Stockholmsserien', [
			['Div 4', 'Grupp 1'],
			['Div 5', 'Grupp 1'],
			['Div 6', 'Grupp 1']
		]);
		setup({ tournaments: [event] });
		expect(screen.getByRole('link', { name: 'Div 6, Grupp 1' })).toBeInTheDocument();
		expect(screen.queryByText(/spelar idag/)).toBeNull();
		expect(document.querySelector('details')).toBeNull();
	});

	it('folds more than three groups away behind a count, closed at first', async () => {
		const event = withClasses(
			5,
			'Allsvenskan',
			[1, 2, 3, 4].map((n) => [`Div ${n}`, 'Grupp 1'] as [string, string])
		);
		setup({ tournaments: [event] });

		const summary = screen.getByText('4 grupper spelar idag');
		const details = summary.closest('details')!;
		expect(details.open).toBe(false);
		// The tournament itself stays a plain link above it.
		expect(screen.getByRole('link', { name: 'Allsvenskan' })).toHaveAttribute('href', '/results/5');

		await userEvent.setup().click(summary);
		expect(details.open).toBe(true);
		expect(within(details).getByRole('link', { name: 'Div 4, Grupp 1' })).toHaveAttribute(
			'href',
			'/results/5/53'
		);
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
