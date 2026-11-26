<script lang="ts">
	/**
	 * The guide section: tournament formats, then the Elo pages under their own
	 * heading. A dropdown on phones, a sticky vertical list from `md` up — the same
	 * `SelectableList` twice, so the two never drift apart.
	 */
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import SidebarLayout from '$lib/components/layout/SidebarLayout.svelte';
	import SelectableList from '$lib/components/ui/SelectableList.svelte';
	import { GUIDE_SECTIONS, activeGuideSection } from '$lib/components/guide/sections';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let { children }: { children: Snippet } = $props();

	let t = $derived(getTranslation(language.current));
	let items = $derived(
		GUIDE_SECTIONS.map((s) => ({ id: s.id, label: s.label(t), group: s.group }))
	);
	let activeId = $derived(activeGuideSection(page.url.pathname));

	function select(id: string | number) {
		const section = GUIDE_SECTIONS.find((s) => s.id === id);
		if (section) goto(section.path);
	}
</script>

<PageLayout maxWidth="5xl">
	<SidebarLayout sticky>
		{#snippet sidebar()}
			<SelectableList
				variant="vertical"
				{items}
				selectedId={activeId}
				onSelect={select}
				placeholder={t.pages.guide.navigation.formats}
			/>
		{/snippet}
		{#snippet narrow()}
			<SelectableList
				variant="dropdown"
				{items}
				selectedId={activeId}
				onSelect={select}
				placeholder={t.pages.guide.navigation.formats}
			/>
		{/snippet}
		{@render children()}
	</SidebarLayout>
</PageLayout>
