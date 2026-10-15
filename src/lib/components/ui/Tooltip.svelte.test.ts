import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Tooltip from './Tooltip.svelte';

const anchor = () => {
	const el = document.createElement('button');
	document.body.appendChild(el);
	return el;
};

describe('Tooltip', () => {
	it('is absent while closed', () => {
		render(Tooltip, { props: { anchor: anchor(), open: false, title: 'Home' } });
		expect(screen.queryByRole('tooltip')).toBeNull();
	});

	it('shows the title while open', () => {
		render(Tooltip, { props: { anchor: anchor(), open: true, title: 'Home' } });
		expect(screen.getByRole('tooltip')).toHaveTextContent('Home');
	});

	it('shows nothing for an empty title', () => {
		render(Tooltip, { props: { anchor: anchor(), open: true, title: '' } });
		expect(screen.queryByRole('tooltip')).toBeNull();
	});
});
