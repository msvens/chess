<script lang="ts">
	/**
	 * Leaflet map of chess clubs.
	 *
	 * Rewritten against raw Leaflet rather than ported from react-leaflet — the
	 * React wrapper existed to make an imperative library declarative, which is
	 * work Svelte does not need. Loaded in `onMount` with a dynamic import because
	 * Leaflet touches `window` at module scope.
	 */
	import { mount, onMount, unmount } from 'svelte';
	import type * as L from 'leaflet';
	import { SWEDEN_CENTER, TILE_SOURCES } from '$lib/geo/mapTiles';
	import { clubIcon } from '$lib/geo/clubIcon';
	import type { GeoPoint } from '$lib/geo/geocodeLoader';
	import type { ClubDTO } from '$lib/api';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { getTranslation } from '$lib/translations';
	import ClubPopup from './ClubPopup.svelte';

	export interface ClubMarker {
		club: ClubDTO;
		point: GeoPoint;
	}

	let { markers }: { markers: ClubMarker[] } = $props();

	const organizations = getOrganizationsState();

	let container = $state<HTMLDivElement | null>(null);
	let map: L.Map | undefined;
	let leaflet: typeof L | undefined;
	let tileLayer: L.TileLayer | undefined;
	let cluster: L.MarkerClusterGroup | undefined;
	// Popups mount lazily; track them so they can be torn down with the map.
	let mountedPopups: Record<string, unknown>[] = [];

	let labels = $derived(getTranslation(language.current).pages.organizations);

	function drawMarkers(lib: typeof L, target: L.Map) {
		cluster?.remove();
		for (const popup of mountedPopups) unmount(popup);
		mountedPopups = [];

		const group = lib.markerClusterGroup({ chunkedLoading: true });
		for (const { club, point } of markers) {
			const districtId = organizations.getDistrictIdForOrganizer(1, club.id);
			const districtName =
				districtId != null ? organizations.getDistrict(districtId)?.name : undefined;

			const marker = lib
				.marker([point.lat, point.lng], { icon: clubIcon(lib, club.schoolClub === 1) })
				// A factory, not a prebuilt node: Leaflet calls it when the popup first
				// opens, so a thousand markers don't mount a thousand components.
				.bindPopup(() => {
					const el = document.createElement('div');
					mountedPopups.push(
						mount(ClubPopup, { target: el, props: { club, districtName, labels } })
					);
					return el;
				});
			group.addLayer(marker);
		}
		group.addTo(target);
		cluster = group;

		if (markers.length > 0) {
			const bounds = lib.latLngBounds(markers.map((m) => [m.point.lat, m.point.lng]));
			target.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
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

	// Redraw when the club set changes — the school-clubs toggle does this.
	$effect(() => {
		void markers;
		if (map && leaflet) drawMarkers(leaflet, map);
	});
</script>

<div
	bind:this={container}
	class="h-[70vh] min-h-[420px] w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
></div>
