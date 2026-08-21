<script lang="ts">
	/** Club detail: contact info, parent district, and the club's rating list. */
	import { page } from '$app/state';
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import Link from '$lib/components/ui/Link.svelte';
	import TextDisplay from '$lib/components/ui/TextDisplay.svelte';
	import InfoField from '$lib/components/organizations/InfoField.svelte';
	import ClubRatingSection from '$lib/components/organizations/ClubRatingSection.svelte';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import { RatingsService } from '$lib/api';

	const organizations = getOrganizationsState();
	const service = new RatingsService();

	let clubId = $derived(Number.parseInt(page.params.id ?? '', 10));
	let club = $derived(Number.isNaN(clubId) ? undefined : organizations.getClub(clubId));

	// The club's current district is the active membership; historical rows stay in
	// the array, so picking the first would often be wrong.
	let parentDistrict = $derived.by(() => {
		const id = club?.districts?.find((d) => d.active === 1)?.districtid;
		return id ? organizations.getDistrict(id) : undefined;
	});

	let t = $derived(getTranslation(language.current));
	let org = $derived(t.pages.organizations);
</script>

<svelte:head><title>{club?.name ?? org.clubNotFound} — msvens chess</title></svelte:head>

<PageLayout maxWidth="4xl">
	{#if organizations.loading}
		<div class="text-center text-gray-600 dark:text-gray-400">{org.loading}</div>
	{:else if !club}
		<div class="text-center text-gray-600 dark:text-gray-400">{org.clubNotFound}</div>
	{:else}
		<div class="space-y-6">
			<div>
				<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-200">{club.name}</h1>
				{#if parentDistrict}
					<div class="mt-1 text-sm text-gray-600 dark:text-gray-400">
						{org.clubs.district}:
						<Link href={`/organizations/districts/${parentDistrict.id}`} color="blue">
							{parentDistrict.name}
						</Link>
					</div>
				{/if}
			</div>

			<div class="grid grid-cols-2 gap-4 text-sm">
				<InfoField label={org.street} value={club.street || '-'} />
				<InfoField label={org.website}>
					{#if club.url}
						<a
							href={club.url}
							target="_blank"
							rel="noopener noreferrer"
							class="text-blue-600 hover:underline dark:text-blue-400"
						>
							{club.url}
						</a>
					{:else}
						-
					{/if}
				</InfoField>
				<InfoField label={org.city} value={club.city || '-'} />
				<InfoField label={org.email} value={club.email || '-'} />
				<InfoField label={org.schoolClub} value={club.schoolClub === 1 ? org.yes : org.no} />
			</div>

			{#if club.vbdescr}
				<TextDisplay text={club.vbdescr} maxLines={2} class="text-sm" />
			{/if}

			<ClubRatingSection
				fetchRatings={(f) =>
					service.getClubRatingList(clubId, f.ratingDate, f.ratingType, f.memberType)}
			/>
		</div>
	{/if}
</PageLayout>
