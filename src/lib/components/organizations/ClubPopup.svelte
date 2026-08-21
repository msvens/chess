<script lang="ts">
	/**
	 * Marker popup content. A component rather than an HTML string because Leaflet
	 * takes a DOM node, and building markup by hand would mean escaping club names
	 * from the API ourselves.
	 *
	 * The link is a plain `<a>`: SvelteKit intercepts clicks on anchors anywhere in
	 * the document, so it navigates client-side even though Leaflet inserted it.
	 */
	import type { ClubDTO } from '$lib/api';
	import type { getTranslation } from '$lib/translations';

	interface ClubPopupProps {
		club: ClubDTO;
		districtName?: string;
		labels: ReturnType<typeof getTranslation>['pages']['organizations'];
	}

	let { club, districtName, labels }: ClubPopupProps = $props();
</script>

<a href="/organizations/clubs/{club.id}" class="block text-sm font-semibold">{club.name}</a>

<dl class="mt-1 space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
	{#if club.city}
		<div class="flex gap-1">
			<dt class="shrink-0 font-medium">{labels.city}:</dt>
			<dd>{club.city}</dd>
		</div>
	{/if}
	{#if districtName}
		<div class="flex gap-1">
			<dt class="shrink-0 font-medium">{labels.clubs.district}:</dt>
			<dd>{districtName}</dd>
		</div>
	{/if}
</dl>

{#if club.schoolClub === 1}
	<p class="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
		{labels.schoolClub}
	</p>
{/if}
