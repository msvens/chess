<script lang="ts">
	/**
	 * The organizations landing page: clubs, map, districts and the federation
	 * ranking as tabs. Ports `app/organizations/page.tsx`.
	 */
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import SearchableSelectableList from '$lib/components/ui/SearchableSelectableList.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import SsfRankingPanel from '$lib/components/organizations/SsfRankingPanel.svelte';
	import ClubMapView from '$lib/components/organizations/ClubMapView.svelte';
	import {
		ORGANIZATIONS_TABS,
		resolveInitialTab,
		setSavedTab,
		type OrganizationsTab
	} from '$lib/components/organizations/organizationsPrefs';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import type { SelectableListItem } from '$lib/components/ui/selectableListLogic';

	const organizations = getOrganizationsState();

	// A ?tab= param wins over the remembered tab, so the redirect stubs and any
	// deep link land where they say. Read once — afterwards the tab is the user's.
	let activeTab = $state<OrganizationsTab>(resolveInitialTab(page.url.searchParams.get('tab')));

	// School clubs are around 62% of active clubs and are not "real" clubs in the
	// sense most visitors mean, so they are out by default.
	let includeSchoolClubs = $state(false);

	let t = $derived(getTranslation(language.current));
	let org = $derived(t.pages.organizations);
	let list = $derived(t.components.selectableList);

	let clubs = $derived(
		organizations
			.getAllClubs({ activeOnly: true, hasRatingPlayersOnly: true })
			.filter((club) => includeSchoolClubs || club.schoolClub !== 1)
	);

	let clubItems = $derived<SelectableListItem[]>(
		clubs.map((club) => ({ id: club.id, label: club.name, subtitle: club.city || undefined }))
	);

	let districtItems = $derived<SelectableListItem[]>(
		[...organizations.districts]
			.sort((a, b) => a.name.localeCompare(b.name, 'sv'))
			.map((d) => ({ id: d.id, label: d.name, subtitle: d.city || undefined }))
	);

	function selectTab(tab: OrganizationsTab) {
		activeTab = tab;
		setSavedTab(tab);
	}
</script>

<svelte:head><title>{org.title} — msvens chess</title></svelte:head>

<PageLayout maxWidth="4xl">
	<PageTitle title={org.title} subtitle={org.subtitle} />

	<div class="mt-2 mb-6 flex border-b border-gray-200 dark:border-gray-700">
		{#each ORGANIZATIONS_TABS as tab (tab)}
			<button
				onclick={() => selectTab(tab)}
				aria-current={activeTab === tab ? 'page' : undefined}
				class="px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors {activeTab === tab
					? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
					: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}"
			>
				{org.tabs[tab]}
			</button>
		{/each}
	</div>

	{#if activeTab === 'clubs' || activeTab === 'map'}
		<div class="mb-4">
			<Toggle
				checked={includeSchoolClubs}
				onChange={(v) => (includeSchoolClubs = v)}
				label={org.includeSchoolClubs}
			/>
		</div>
	{/if}

	{#if organizations.error}
		<div class="text-center text-red-600 dark:text-red-400">{organizations.error}</div>
	{:else if activeTab === 'clubs'}
		<div class="space-y-4">
			<div class="max-w-md">
				<SearchableSelectableList
					items={clubItems}
					selectedId={null}
					onSelect={(id) => goto(`/organizations/clubs/${id}`)}
					placeholder={org.clubs.searchPlaceholder}
					filterPlaceholder={list.filterPlaceholder}
					noResultsLabel={list.noResults}
					resultCountTemplate={list.resultCount}
				/>
			</div>
			<div class="text-sm text-gray-600 dark:text-gray-400">
				{organizations.loading ? org.loading : `${clubs.length} ${org.clubs.activeClubs}`}
			</div>
		</div>
	{:else if activeTab === 'map'}
		<ClubMapView {clubs} loading={organizations.loading} error={organizations.error} />
	{:else if activeTab === 'districts'}
		<div class="space-y-4">
			<div class="max-w-md">
				<SearchableSelectableList
					items={districtItems}
					selectedId={null}
					onSelect={(id) => goto(`/organizations/districts/${id}`)}
					placeholder={org.districts.selectDistrict}
					filterPlaceholder={list.filterPlaceholder}
					noResultsLabel={list.noResults}
					resultCountTemplate={list.resultCount}
				/>
			</div>
			<div class="text-sm text-gray-600 dark:text-gray-400">
				{organizations.loading
					? org.loading
					: `${organizations.districts.length} ${org.districts.title.toLowerCase()}`}
			</div>
		</div>
	{:else}
		<SsfRankingPanel />
	{/if}
</PageLayout>
