import { redirect } from '@sveltejs/kit';
import { legacyEloPath } from '$lib/components/guide/sections';

/** Elo moved under the guide; every old `/elo/…` page redirects to its new home. */
export function load({ params }: { params: { rest: string } }) {
	redirect(301, legacyEloPath(params.rest));
}
