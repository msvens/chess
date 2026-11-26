import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { encode } from 'uqr';
import QrCode from './QrCode.svelte';

describe('QrCode', () => {
	const value = 'https://chess.msvens.com/results/7457/12345';

	it('is an image named by its label', () => {
		render(QrCode, { value, label: 'QR code for this page' });
		expect(screen.getByRole('img', { name: 'QR code for this page' })).toBeInTheDocument();
	});

	it('draws every dark module of the encoded value, quiet zone included', () => {
		const { container } = render(QrCode, { value, label: 'QR' });
		const qr = encode(value, { border: 2 });
		const svg = container.querySelector('svg')!;
		const d = svg.querySelector('path')!.getAttribute('d')!;

		expect(svg.getAttribute('viewBox')).toBe(`0 0 ${qr.size} ${qr.size}`);
		expect(d.match(/M/g)).toHaveLength(qr.data.flat().filter(Boolean).length);
		// The border rows stay white.
		expect(d).not.toMatch(/M\d+ 0h/);
	});
});
