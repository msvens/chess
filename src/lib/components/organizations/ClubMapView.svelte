<script lang="ts">
	/**
	 * The Map tab: resolves each club to a coordinate, then hands the resolvable
	 * ones to the map and lists the rest so nothing disappears silently.
	 * Ports `components/organizations/ClubMapView.tsx`.
	 */
	import { onMount } from 'svelte';
	import type { ClubDTO } from '$lib/api';
	import Link from '$lib/components/ui/Link.svelte';
	import { resolveClubLocation } from '$lib/geo/geocodeLoader';
	import { cityGeocodes, clubGeocodes } from '$lib/geo/geocodes.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import ClubMap, { type ClubMarker } from './ClubMap.svelte';

	interface ClubMapViewProps {
		clubs: ClubDTO[];
		loading?: boolean;
		error?: string | null;
	}

	let { clubs, loading = false, error = null }: ClubMapViewProps = $props();

	onMount(() => {
		clubGeocodes.load();
		cityGeocodes.load();
	});

	let t = $derived(getTranslation(language.current).pages.organizations.map);

	let resolved = $derived.by(() => {
		const mapped: ClubMarker[] = [];
		const unmapped: ClubDTO[] = [];
		if (!clubGeocodes.data) return { mapped, unmapped };
		for (const club of clubs) {
			const point = resolveClubLocation(clubGeocodes.data, cityGeocodes.data, club);
			if (point) mapped.push({ club, point });
			else unmapped.push(club);
		}
		return { mapped, unmapped };
	});

	// The street-level table is required; the city table is only a fallback, so a
	// failure there is not fatal.
	let busy = $derived(loading || clubGeocodes.loading || cityGeocodes.loading);
	let message = $derived(error || clubGeocodes.error);
</script>

{#if message}
	<div
		class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
	>
		{message}
	</div>
{:else if busy}
	<div
		class="flex h-[70vh] min-h-[420px] w-full items-center justify-center rounded-lg border border-gray-200 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
	>
		{t.loading}
	</div>
{:else if clubs.length === 0}
	<div
		class="rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
	>
		{t.empty}
	</div>
{:else}
	<div class="space-y-4">
		<p class="text-xs text-gray-500 dark:text-gray-400">{t.streetNote}</p>
		<ClubMap markers={resolved.mapped} />
		<p class="text-[11px] text-gray-400 dark:text-gray-500">{t.attribution}</p>

		{#if resolved.unmapped.length > 0}
			<div
				class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40"
			>
				<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
					{t.unmapped.replace('{count}', String(resolved.unmapped.length))}
				</h3>
				<p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t.unmappedHint}</p>
				<ul class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
					{#each resolved.unmapped as club (club.id)}
						<li>
							<Link href={`/organizations/clubs/${club.id}`} color="blue" underline="hover">
								{club.name}
							</Link>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
{/if}
