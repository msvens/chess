import { describe, expect, it } from 'vitest';
import { load as loadRoot } from '../+page';
import { load } from './+page';

/** `redirect` throws, which is how SvelteKit signals one from a load. */
function redirectOf(run: () => void) {
	try {
		run();
	} catch (error) {
		return error;
	}
	throw new Error('expected a redirect');
}

describe('the old /elo addresses', () => {
	it('send the section root to the first Elo page in the guide', () => {
		expect(redirectOf(() => loadRoot())).toMatchObject({
			status: 301,
			location: '/guide/elo/basics'
		});
	});

	it.each([
		['basics', '/guide/elo/basics'],
		['calculation', '/guide/elo/formula'],
		['fine-print', '/guide/elo/fine-print'],
		['calculator', '/guide/elo/calculator']
	])('send /elo/%s to %s', (rest, location) => {
		expect(redirectOf(() => load({ params: { rest } }))).toMatchObject({ status: 301, location });
	});
});
