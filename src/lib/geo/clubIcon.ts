/**
 * Marker icons for the club map.
 *
 * A plain module, not part of the component: the icons depend only on whether a
 * club is a school club, so one cache serves every map instance. Leaflet is
 * passed in because it is dynamically imported (it touches `window` at module
 * scope, so it cannot be imported at the top of a module that might be evaluated
 * during a build).
 */
import type * as L from 'leaflet';

const cache = new Map<string, L.DivIcon>();

/** Regular clubs and school clubs get distinct dots; one icon per kind, reused. */
export function clubIcon(lib: typeof L, isSchoolClub: boolean): L.DivIcon {
	const key = isSchoolClub ? 'school' : 'club';
	const cached = cache.get(key);
	if (cached) return cached;

	const swatch = isSchoolClub ? 'bg-amber-500' : 'bg-indigo-500';
	const icon = lib.divIcon({
		className: 'club-marker',
		html: `<span class="block h-5 w-5 rounded-full border-2 border-white shadow ${swatch}"></span>`,
		iconSize: [20, 20],
		iconAnchor: [10, 10],
		popupAnchor: [0, -11]
	});
	cache.set(key, icon);
	return icon;
}
