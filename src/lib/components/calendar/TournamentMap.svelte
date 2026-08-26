<script lang="ts">
	/**
	 * Leaflet map of tournament locations.
	 *
	 * Same shape as `organizations/ClubMap.svelte`, and for the same reasons: raw
	 * Leaflet rather than a declarative wrapper, loaded in `onMount` with a dynamic
	 * import because Leaflet touches `window` at module scope. That also replaces
	 * the React version's `next/dynamic(..., { ssr: false })` — there is nothing
	 * left to code-split around.
	 *
	 * The basemap look lives entirely in `TILE_SOURCES`; switching raster style, or
	 * to vector tiles later, touches that constant and nothing here.
	 */
	import { mount, onMount, unmount } from 'svelte';
	import type * as L from 'leaflet';
	import { SWEDEN_CENTER, TILE_SOURCES } from '$lib/geo/mapTiles';
	import { tournamentIcon } from '$lib/geo/tournamentIcon';
	import type { GeoPoint } from '$lib/geo/geocodeLoader';
	import type { TournamentDto } from '$lib/api';
	import TournamentPopup from './TournamentPopup.svelte';
	import { longDateFormat, typeLabel } from './eventLabels';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { localeOf } from '$lib/i18n';
	import { theme } from '$lib/stores/theme.svelte';
	import { getTranslation } from '$lib/translations';

	export interface MapMarker {
		tournament: TournamentDto;
		point: GeoPoint;
	}

	let { markers }: { markers: MapMarker[] } = $props();

	const organizations = getOrganizationsState();

	let container = $state<HTMLDivElement | null>(null);
	let map: L.Map | undefined;
	let leaflet: typeof L | undefined;
	let tileLayer: L.TileLayer | undefined;
	let cluster: L.MarkerClusterGroup | undefined;
	// Popups mount lazily; track them so they can be torn down with the map.
	let mountedPopups: Record<string, unknown>[] = [];

	let t = $derived(getTranslation(language.current));
	let popupLabels = $derived({
		...t.pages.calendar.dayDetails,
		reversedDates: t.pages.calendar.reversedDates
	});
	let typeLabels = $derived(t.components.tournamentTypeFilter);
	let dateFormat = $derived(longDateFormat(localeOf(language.current)));

	function drawMarkers(lib: typeof L, target: L.Map) {
		cluster?.remove();
		for (const popup of mountedPopups) unmount(popup);
		mountedPopups = [];

		const group = lib.markerClusterGroup({ chunkedLoading: true });
		for (const { tournament, point } of markers) {
			const marker = lib
				.marker([point.lat, point.lng], { icon: tournamentIcon(lib, tournament.type) })
				// A factory, not a prebuilt node: Leaflet calls it when the popup first
				// opens, so 137 markers do not mount 137 components.
				.bindPopup(() => {
					const element = document.createElement('div');
					mountedPopups.push(
						mount(TournamentPopup, {
							target: element,
							props: {
								tournament,
								organizerName: organizations.getOrganizerName(
									tournament.orgType,
									tournament.orgNumber
								),
								typeName: typeLabel(tournament.type, typeLabels),
								dateFormat,
								labels: popupLabels
							}
						})
					);
					return element;
				});
			group.addLayer(marker);
		}
		group.addTo(target);
		cluster = group;

		if (markers.length > 0) {
			const bounds = lib.latLngBounds(markers.map((m) => [m.point.lat, m.point.lng]));
			target.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
		}
	}

	onMount(() => {
		let disposed = false;

		(async () => {
			const lib = (await import('leaflet')).default;
			await import('leaflet.markercluster');
			await import('leaflet/dist/leaflet.css');
			await import('leaflet.markercluster/dist/MarkerCluster.css');
			await import('leaflet.markercluster/dist/MarkerCluster.Default.css');
			if (disposed || !container) return;

			leaflet = lib;
			map = lib.map(container, { center: SWEDEN_CENTER, zoom: 5, scrollWheelZoom: true });
			tileLayer = lib.tileLayer(TILE_SOURCES[theme.current].url, {
				attribution: TILE_SOURCES[theme.current].attribution
			});
			tileLayer.addTo(map);
			drawMarkers(lib, map);
		})();

		return () => {
			disposed = true;
			for (const popup of mountedPopups) unmount(popup);
			mountedPopups = [];
			map?.remove();
			map = undefined;
		};
	});

	// Swap the basemap when the theme changes — the React version remounted the
	// tile layer via `key={theme}`; this is the imperative equivalent.
	$effect(() => {
		const tiles = TILE_SOURCES[theme.current];
		if (!map || !tileLayer || !leaflet) return;
		tileLayer.setUrl(tiles.url);
		tileLayer.getContainer()?.setAttribute('data-theme', theme.current);
	});

	// Redraw when the filters change the marker set, or when the language changes
	// the popups' labels.
	$effect(() => {
		void markers;
		void popupLabels;
		if (map && leaflet) drawMarkers(leaflet, map);
	});
</script>

<div
	bind:this={container}
	class="h-[70vh] min-h-[420px] w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
></div>
