import { redirect } from '@sveltejs/kit';

/** `/guide` has no page of its own; tournament formats is the only section. */
export function load() {
	redirect(307, '/guide/formats');
}
