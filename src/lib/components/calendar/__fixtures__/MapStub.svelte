<script lang="ts">
	/**
	 * Stands in for `TournamentMap` in tests.
	 *
	 * Leaflet is dynamically imported and measures real DOM, neither of which jsdom
	 * can honour — the map itself is checked in a browser. What the tests around it
	 * care about is which tournaments were resolved to a coordinate, so this
	 * reports the count and nothing else.
	 */
	import type { TournamentDto } from '$lib/api';
	import type { GeoPoint } from '$lib/geo/geocodeLoader';

	let { markers }: { markers: { tournament: TournamentDto; point: GeoPoint }[] } = $props();
</script>

<div data-testid="map-markers">{markers.length}</div>
