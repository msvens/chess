<script lang="ts">
	/**
	 * The guide section: tournament formats, then the Elo pages under their own
	 * heading. A dropdown under `lg`, a sticky vertical list above it — the same
	 * `SelectableList` twice, so the two never drift apart.
	 */
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
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
	<div class="mb-6 lg:hidden">
		<SelectableList
			variant="dropdown"
			{items}
			selectedId={activeId}
			onSelect={select}
			placeholder={t.pages.guide.navigation.formats}
		/>
	</div>

	<div class="flex flex-row gap-8">
		<div class="hidden w-56 flex-shrink-0 lg:block">
			<div class="sticky top-24">
				<SelectableList
					variant="vertical"
					{items}
					selectedId={activeId}
					onSelect={select}
					placeholder={t.pages.guide.navigation.formats}
				/>
			</div>
		</div>

		<div class="min-w-0 flex-1">
			{@render children()}
		</div>
	</div>
</PageLayout>
