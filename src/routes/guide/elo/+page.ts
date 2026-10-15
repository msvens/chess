import { redirect } from '@sveltejs/kit';

/** `/guide/elo` has no page of its own; its first page is the landing. */
export function load() {
	redirect(307, '/guide/elo/basics');
}
