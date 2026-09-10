import { redirect } from '@sveltejs/kit';

/** `/junior` has no page of its own; the JGP standings are the section. */
export function load() {
	redirect(307, '/junior/stockholms-jgp');
}
