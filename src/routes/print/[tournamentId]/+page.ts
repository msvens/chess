import { error, redirect } from '@sveltejs/kit';
import { TournamentService } from '$lib/api';
import { firstGroupId } from '$lib/print/printData';

/**
 * `/print/[tournamentId]` has no sheet of its own; send it to the first group,
 * mirroring `/results/[tournamentId]`.
 *
 * A `load` rather than the React version's component-with-an-effect, so the
 * redirect happens before anything paints instead of after a spinner.
 */
export async function load({ params }) {
	const tournamentId = Number.parseInt(params.tournamentId ?? '', 10);
	if (Number.isNaN(tournamentId)) error(404, 'Invalid tournament id');

	const response = await new TournamentService().getTournament(tournamentId);
	if (response.status !== 200 || !response.data) error(404, 'Tournament not found');

	const groupId = firstGroupId(response.data);
	if (groupId == null) error(404, 'Tournament has no groups');

	redirect(307, `/print/${tournamentId}/${groupId}`);
}
