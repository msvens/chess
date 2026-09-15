import { describe, expect, it } from 'vitest';
import { tileSources } from '../mapTiles';

describe('tileSources', () => {
	it('requests keyless tiles when no key is configured', () => {
		const { light, dark } = tileSources(undefined);
		expect(light.url).toBe('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png');
		expect(dark.url).toBe('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
	});

	it('treats an empty key as no key', () => {
		// `VITE_CARTO_KEY=` with no value reads as an empty string, and `?key=` would
		// be a 403 rather than a watermark.
		expect(tileSources('').light.url).not.toContain('?');
	});

	it('appends the key to both themes, after the retina placeholder', () => {
		const { light, dark } = tileSources('abc_123');
		expect(light.url).toBe(
			'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=abc_123'
		);
		expect(dark.url).toBe(
			'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=abc_123'
		);
	});

	it('encodes the key so it cannot break the URL or the Leaflet template', () => {
		expect(tileSources('a&b{c}').light.url).toMatch(/\?key=a%26b%7Bc%7D$/);
	});

	it('credits OpenStreetMap and CARTO on both maps, as the free key requires', () => {
		for (const source of Object.values(tileSources('k'))) {
			expect(source.attribution).toContain('OpenStreetMap');
			expect(source.attribution).toContain('CARTO');
		}
	});
});
