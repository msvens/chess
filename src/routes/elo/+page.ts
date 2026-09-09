import { redirect } from '@sveltejs/kit';

/** `/elo` has no page of its own; the first section is the landing. */
export function load() {
	redirect(307, '/elo/basics');
}
