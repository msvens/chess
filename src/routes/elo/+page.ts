import { redirect } from '@sveltejs/kit';

/** Elo moved under the guide; the old section root lands on its first page. */
export function load() {
	redirect(301, '/guide/elo/basics');
}
