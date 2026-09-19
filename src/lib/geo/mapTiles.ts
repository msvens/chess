/**
 * Shared Leaflet basemap config for the calendar and club maps. This is the
 * single swap point for how the map looks — change a URL here (or point at
 * MapLibre vector tiles later) and both maps follow. CARTO raster, theme-aware.
 *
 * Since August 2026 CARTO stamps "API KEY REQUIRED" across keyless tiles. A key
 * removes it, but ours is referrer-restricted to the production domain, and a
 * keyed tile requested from anywhere else — localhost included, or with no
 * referrer — is a 403 with no map at all. So the key is set only in the production
 * build environment, and the dev server keeps watermarked tiles.
 */

const ATTRIBUTION =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export interface TileSource {
	url: string;
	attribution: string;
}

/** The light and dark basemaps, keyed when `key` is non-empty. */
export function tileSources(key: string | undefined): Record<'light' | 'dark', TileSource> {
	const query = key ? `?key=${encodeURIComponent(key)}` : '';
	return {
		light: {
			url: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${query}`,
			attribution: ATTRIBUTION
		},
		dark: {
			url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${query}`,
			attribution: ATTRIBUTION
		}
	};
}

export const TILE_SOURCES = tileSources(import.meta.env.VITE_CARTO_KEY);

/** Roughly centres the map on Sweden before fitting to markers. */
export const SWEDEN_CENTER: [number, number] = [62.5, 16.5];
