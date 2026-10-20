import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ORGANIZATIONS_STATE_KEY, OrganizationsState } from '$lib/stores/organizations.svelte';
import Page from './+page.svelte';

const goto = vi.fn();
const getTournamentFromGroup = vi.fn();

vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => goto(...args) }));

vi.mock('$lib/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api')>();
	return {
		...actual,
		TournamentService: class {
			// The page loads a date range on mount; the list itself is beside the point.
			searchUpdatedTournaments = () => Promise.resolve({ status: 200, data: [] });
			searchGroups = () => Promise.resolve({ status: 200, data: [] });
			getTournamentFromGroup = (...args: unknown[]) => getTournamentFromGroup(...args);
		}
	};
});

const groupField = () => screen.getByPlaceholderText('Grupp-id eller länk till schack.se sida');

/** The district filter reads the organizations; unloaded is enough for these tests. */
const renderPage = () =>
	render(Page, { context: new Map([[ORGANIZATIONS_STATE_KEY, new OrganizationsState()]]) });

async function open(input: string) {
	const user = userEvent.setup();
	await user.type(groupField(), input);
	await user.click(screen.getByRole('button', { name: 'Öppna' }));
}

describe('opening a group by id or link', () => {
	beforeEach(() => {
		goto.mockReset();
		getTournamentFromGroup.mockReset();
	});

	it('goes straight to the group’s results, under its tournament', async () => {
		getTournamentFromGroup.mockResolvedValue({ status: 200, data: { id: 7106 } });
		renderPage();
		await open('19134');

		expect(getTournamentFromGroup).toHaveBeenCalledWith(19134);
		expect(goto).toHaveBeenCalledWith('/results/7106/19134');
	});

	it('takes a resultat.schack.se link', async () => {
		getTournamentFromGroup.mockResolvedValue({ status: 200, data: { id: 7106 } });
		renderPage();
		await open('https://resultat.schack.se/ShowTournamentServlet?id=19134');

		expect(goto).toHaveBeenCalledWith('/results/7106/19134');
	});

	it('says so when the id is unknown', async () => {
		getTournamentFromGroup.mockResolvedValue({ status: 404 });
		renderPage();
		await open('99999999');

		expect(await screen.findByText('Ingen grupp med id 99999999')).toBeInTheDocument();
		expect(goto).not.toHaveBeenCalled();
	});

	it('asks for an id or a link, without a request, for anything else', async () => {
		renderPage();
		await open('Allsvenskan');

		expect(
			screen.getByText('Ange ett grupp-id eller en länk till en schack.se sida')
		).toBeInTheDocument();
		expect(getTournamentFromGroup).not.toHaveBeenCalled();
	});

	it('says the lookup failed when the server does', async () => {
		getTournamentFromGroup.mockResolvedValue({ status: 500, error: 'boom' });
		renderPage();
		await open('19134');

		expect(await screen.findByText('Kunde inte slå upp gruppen')).toBeInTheDocument();
	});
});
