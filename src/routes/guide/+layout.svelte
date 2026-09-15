<script lang="ts">
	/**
	 * The guide section. Ports `app/guide/layout.tsx` — the Elo section's layout
	 * with one entry, like the junior section, kept because it is what makes the
	 * page look like the rest of the app.
	 */
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import SelectableList from '$lib/components/ui/SelectableList.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let { children }: { children: Snippet } = $props();

	const FORMATS = '/guide/formats';

	let t = $derived(getTranslation(language.current));
	let items = $derived([{ id: 'formats', label: t.pages.guide.navigation.formats }]);
</script>

<PageLayout maxWidth="5xl">
	<div class="mb-6 lg:hidden">
		<SelectableList
			variant="dropdown"
			{items}
			selectedId="formats"
			onSelect={() => goto(FORMATS)}
			placeholder={t.pages.guide.navigation.formats}
		/>
	</div>

	<div class="flex flex-row gap-8">
		<div class="hidden w-56 flex-shrink-0 lg:block">
			<div class="sticky top-24">
				<SelectableList
					variant="vertical"
					{items}
					selectedId="formats"
					onSelect={() => goto(FORMATS)}
					placeholder={t.pages.guide.navigation.formats}
				/>
			</div>
		</div>

		<div class="min-w-0 flex-1">
			{@render children()}
		</div>
	</div>
</PageLayout>
