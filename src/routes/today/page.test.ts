import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TournamentDto } from '$lib/api';
import { ORGANIZATIONS_STATE_KEY, OrganizationsState } from '$lib/stores/organizations.svelte';
import Page from './+page.svelte';

const getTournamentsToday = vi.fn();

vi.mock('$lib/api', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/api')>()),
	getTournamentsToday: (...args: unknown[]) => getTournamentsToday(...args)
}));

const INDIVIDUAL = 3;
const GRAND_PRIX = 7;

const tournament = (id: number, name: string, type = INDIVIDUAL) =>
	({ id, name, type, orgType: 1, orgNumber: 1 }) as TournamentDto;

function setup() {
	render(Page, {
		context: new Map([[ORGANIZATIONS_STATE_KEY, new OrganizationsState()]])
	});
}

beforeEach(() => getTournamentsToday.mockReset());

describe('the today page', () => {
	it('lists what is being played, without Grand Prix series', async () => {
		getTournamentsToday.mockResolvedValue({
			status: 200,
			data: [tournament(1, 'Farsta JGP'), tournament(2, 'Grand Prix-serien', GRAND_PRIX)]
		});
		setup();
		expect(await screen.findByRole('link', { name: 'Farsta JGP' })).toBeInTheDocument();
		expect(screen.queryByText('Grand Prix-serien')).toBeNull();
	});

	it('says so when the search fails', async () => {
		getTournamentsToday.mockResolvedValue({ status: 500, error: 'boom' });
		setup();
		expect(await screen.findByText('Kunde inte ladda turneringar')).toBeInTheDocument();
	});
});
