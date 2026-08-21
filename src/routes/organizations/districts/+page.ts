import { redirect } from '@sveltejs/kit';

/** See the sibling stub under `clubs/` — same reasoning. */
export function load() {
	redirect(307, '/organizations?tab=districts');
}
