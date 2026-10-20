import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ORGANIZATIONS_STATE_KEY, OrganizationsState } from '$lib/stores/organizations.svelte';
import Page from './+page.svelte';

const goto = vi.fn();
const getTournamentFromGroup = vi.fn();
const searchGroups = vi.fn();

vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => goto(...args) }));

vi.mock('$lib/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api')>();
	return {
		...actual,
		TournamentService: class {
			// The page loads a date range on mount; the list itself is beside the point.
			searchUpdatedTournaments = () => Promise.resolve({ status: 200, data: [] });
			searchGroups = (...args: unknown[]) => searchGroups(...args);
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

describe('a name search that hits the group cap', () => {
	const truncatedNote = /Sökningen nådde maxantalet träffar/;

	/** `count` groups, five to a tournament, as a broad word like "Allsvenskan" returns. */
	const groups = (count: number) =>
		Array.from({ length: count }, (_, i) => ({
			id: i + 1,
			name: `Grupp ${i + 1}`,
			tournamentid: 1000 + Math.floor(i / 5),
			tournamentname: `Allsvenskan ${Math.floor(i / 5)}`,
			latestUpdatedGame: null
		}));

	async function searchFor(word: string) {
		const user = userEvent.setup();
		await user.type(screen.getByPlaceholderText('Ange turneringsnamn eller plats...'), word);
		// The date row's button comes first; the name search's is the second.
		await user.click(screen.getAllByRole('button', { name: 'Sök' })[1]);
	}

	beforeEach(() => searchGroups.mockReset());

	it('says the list is only the oldest matches', async () => {
		searchGroups.mockResolvedValue({ status: 200, data: groups(100) });
		renderPage();
		await searchFor('Allsvenskan');

		expect(await screen.findByText(truncatedNote)).toBeInTheDocument();
	});

	it('says nothing below the cap', async () => {
		searchGroups.mockResolvedValue({ status: 200, data: groups(99) });
		renderPage();
		await searchFor('Allsvenskan');

		expect(await screen.findByText('Allsvenskan 0')).toBeInTheDocument();
		expect(screen.queryByText(truncatedNote)).not.toBeInTheDocument();
	});

	it('drops the note once a date search owns the list', async () => {
		searchGroups.mockResolvedValue({ status: 200, data: groups(100) });
		renderPage();
		await searchFor('Allsvenskan');
		await screen.findByText(truncatedNote);

		await userEvent.setup().click(screen.getAllByRole('button', { name: 'Sök' })[0]);

		expect(screen.queryByText(truncatedNote)).not.toBeInTheDocument();
	});
});
