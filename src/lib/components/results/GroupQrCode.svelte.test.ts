import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { encode } from 'uqr';
import GroupQrCode from './GroupQrCode.svelte';

describe('GroupQrCode', () => {
	it('encodes the public address of the page, whatever host serves it', () => {
		const { container } = render(GroupQrCode, { path: '/results/7457/12345' });
		const qr = encode('https://chess.msvens.com/results/7457/12345', { border: 2 });

		expect(screen.getByRole('img')).toBeInTheDocument();
		expect(container.querySelector('path')!.getAttribute('d')!.match(/M/g)).toHaveLength(
			qr.data.flat().filter(Boolean).length
		);
	});
});
