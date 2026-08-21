<script lang="ts">
	/** District detail: contact info, a district switcher, and its rating list. */
	import { page } from '$app/state';
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import DistrictSelector from '$lib/components/organizations/DistrictSelector.svelte';
	import ClubRatingSection from '$lib/components/organizations/ClubRatingSection.svelte';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import { RatingsService } from '$lib/api';

	const organizations = getOrganizationsState();
	const service = new RatingsService();

	let districtId = $derived(Number.parseInt(page.params.id ?? '', 10));
	let district = $derived(
		Number.isNaN(districtId) ? undefined : organizations.getDistrict(districtId)
	);

	let t = $derived(getTranslation(language.current));
	let org = $derived(t.pages.organizations);
</script>

<svelte:head><title>{district?.name ?? org.districts.title} — msvens chess</title></svelte:head>

{#if organizations.loading}
	<div class="text-center text-gray-600 dark:text-gray-400">{org.loading}</div>
{:else if Number.isNaN(districtId)}
	<div class="text-center text-gray-600 dark:text-gray-400">{org.districts.selectDistrict}</div>
{:else}
	<div class="space-y-6">
		<PageTitle title={district?.name ?? org.districts.title} subtitle={org.districts.subtitle} />

		{#if district}
			<div class="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
				{#if district.city}<span>{district.city}</span>{/if}
				{#if district.email}<span>{district.email}</span>{/if}
				{#if district.url}
					<a
						href={district.url}
						target="_blank"
						rel="noopener noreferrer"
						class="text-blue-600 hover:underline dark:text-blue-400"
					>
						{district.url}
					</a>
				{/if}
			</div>
		{/if}

		<DistrictSelector selectedDistrictId={districtId} />

		<ClubRatingSection
			fetchRatings={(f) =>
				service.getDistrictRatingList(districtId, f.ratingDate, f.ratingType, f.memberType)}
		/>
	</div>
{/if}
