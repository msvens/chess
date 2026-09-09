/**
 * Marker icons for the tournament map.
 *
 * One icon per tournament type, cached across map instances — the calendar draws
 * up to 137 markers and there are only eight types. A `divIcon` rather than an
 * image sidesteps Leaflet's broken default-marker path under bundlers, and lets
 * the dots share the colours the calendar bars already use.
 *
 * Leaflet is passed in because it is dynamically imported: it touches `window`
 * at module scope, so it cannot be imported at the top of a module that might be
 * evaluated during a build.
 */
import type * as L from 'leaflet';
import { swatchClasses } from '$lib/components/calendar/calendarColors';

const cache = new Map<number, L.DivIcon>();

export function tournamentIcon(lib: typeof L, type: number): L.DivIcon {
	const cached = cache.get(type);
	if (cached) return cached;

	const icon = lib.divIcon({
		className: 'tournament-marker',
		html: `<span class="block h-3.5 w-3.5 rounded-full border-2 border-white shadow ${swatchClasses(type)}"></span>`,
		iconSize: [14, 14],
		iconAnchor: [7, 7],
		popupAnchor: [0, -8]
	});
	cache.set(type, icon);
	return icon;
}
