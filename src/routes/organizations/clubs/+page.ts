import { redirect } from '@sveltejs/kit';

/**
 * `/clubs` and `/districts` were standalone pages before the tabs existed. Keep
 * the URLs working by sending them at the matching tab.
 *
 * A `load` redirect rather than a component that navigates on mount: it happens
 * before anything renders, so there is no flash of an empty page.
 */
export function load() {
	redirect(307, '/organizations?tab=clubs');
}
