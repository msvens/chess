import { render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import PageHead from './PageHead.svelte';

const meta = (name: string) =>
	document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? null;

afterEach(() => {
	document.title = '';
	document.head.querySelectorAll('meta[name]').forEach((m) => m.remove());
});

describe('PageHead', () => {
	it('suffixes the title with the site’s name', () => {
		render(PageHead, { props: { title: 'Kalender' } });
		expect(document.title).toBe('Kalender — msvens chess');
	});

	it('is just the site’s name without a title', () => {
		render(PageHead);
		expect(document.title).toBe('msvens chess');
	});

	it('sets the description when given one', () => {
		render(PageHead, { props: { title: 'Kalender', description: 'Kommande turneringar.' } });
		expect(meta('description')).toBe('Kommande turneringar.');
	});

	it('asks not to be indexed only when told to', () => {
		const { unmount } = render(PageHead, { props: { title: 'Utskrift' } });
		expect(meta('robots')).toBeNull();
		unmount();
		render(PageHead, { props: { title: 'Utskrift', noindex: true } });
		expect(meta('robots')).toBe('noindex');
	});
});
