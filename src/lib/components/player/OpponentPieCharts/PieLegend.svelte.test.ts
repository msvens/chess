import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import PieLegend from './PieLegend.svelte';

const slices = [
	{ label: 'Vinster', value: 3, colour: '#22c55e' },
	{ label: 'Remier', value: 0, colour: '#6b7280' },
	{ label: 'Förluster', value: 1, colour: '#ef4444' }
];

describe('PieLegend', () => {
	it('lists every slice alphabetically, a zero one included', () => {
		render(PieLegend, { slices });
		const labels = [...document.querySelectorAll('span')].map((span) => span.textContent?.trim());
		expect(labels).toEqual(['Förluster', 'Remier', 'Vinster']);
	});

	it('gives each entry its slice colour', () => {
		render(PieLegend, { slices });
		const dot = screen.getByText('Remier').querySelector('circle');
		expect(dot?.getAttribute('fill')).toBe('#6b7280');
	});
});
