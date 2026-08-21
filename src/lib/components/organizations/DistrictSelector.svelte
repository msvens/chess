<script lang="ts">
	/**
	 * Jump to another district. Ports `components/organizations/DistrictSelector.tsx`.
	 */
	import { goto } from '$app/navigation';
	import SelectableList from '$lib/components/ui/SelectableList.svelte';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import type { SelectableListItem } from '$lib/components/ui/selectableListLogic';

	let { selectedDistrictId }: { selectedDistrictId: number | null } = $props();

	const organizations = getOrganizationsState();

	let t = $derived(getTranslation(language.current));
	let items = $derived<SelectableListItem[]>(
		organizations.districts.map((d) => ({ id: d.id, label: d.name }))
	);
</script>

<SelectableList
	{items}
	selectedId={selectedDistrictId}
	onSelect={(id) => goto(`/organizations/districts/${id}`)}
	title={t.pages.organizations.districts.selectDistrict}
	placeholder={t.components.selectableList.selectPlaceholder}
	variant="dropdown"
	density="compact"
	transparent
/>
