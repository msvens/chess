<script lang="ts">
	/**
	 * The Map tab: resolves each tournament to a coordinate, then hands the
	 * resolvable ones to the map and lists the rest so nothing disappears silently.
	 * Ports `components/calendar/MapView.tsx`.
	 *
	 * The fallback matters more than it looks: 47 of the 137 upcoming tournaments
	 * carry no city of their own, so without the organising club's city a third of
	 * the map would be missing.
	 */
	import { onMount } from 'svelte';
	import Link from '$lib/components/ui/Link.svelte';
	import type { TournamentDto } from '$lib/api';
	import { resolveTournamentLocation } from '$lib/geo/geocodeLoader';
	import { cityGeocodes } from '$lib/geo/geocodes.svelte';
	import TournamentMap, { type MapMarker } from './TournamentMap.svelte';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface MapViewProps {
		tournaments: TournamentDto[];
		loading?: boolean;
		error?: string;
	}

	let { tournaments, loading = false, error }: MapViewProps = $props();

	const organizations = getOrganizationsState();

	onMount(() => cityGeocodes.load());

	let t = $derived(getTranslation(language.current).pages.calendar.map);

	let resolved = $derived.by(() => {
		const mapped: MapMarker[] = [];
		const unmapped: TournamentDto[] = [];
		if (!cityGeocodes.data) return { mapped, unmapped };

		for (const tournament of tournaments) {
			// A tournament with no city of its own falls back to the organising
			// club's — `orgType` 1 means `orgNumber` is a club id.
			const fallbackCity =
				!tournament.city?.trim() && tournament.orgType === 1
					? organizations.getClub(tournament.orgNumber)?.city
					: undefined;

			const point = resolveTournamentLocation(cityGeocodes.data, tournament, fallbackCity);
			if (point) mapped.push({ tournament, point });
			else unmapped.push(tournament);
		}
		return { mapped, unmapped };
	});

	let busy = $derived(loading || cityGeocodes.loading);
	let message = $derived(error || cityGeocodes.error);
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
{:else if tournaments.length === 0}
	<div
		class="rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
	>
		{t.empty}
	</div>
{:else}
	<div class="space-y-4">
		<p class="text-xs text-gray-500 dark:text-gray-400">{t.cityNote}</p>
		<TournamentMap markers={resolved.mapped} />
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
					{#each resolved.unmapped as tournament (tournament.id)}
						<li>
							<Link href="/results/{tournament.id}" color="blue" underline="hover">
								{tournament.name}
							</Link>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
{/if}
