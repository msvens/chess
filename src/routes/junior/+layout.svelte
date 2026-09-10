<script lang="ts">
	/**
	 * The junior section. Ports `app/junior/layout.tsx` — the Elo section's
	 * layout with one entry, kept because more junior series are expected and
	 * because it is what makes the page look like the rest of the app.
	 */
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import SelectableList from '$lib/components/ui/SelectableList.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let { children }: { children: Snippet } = $props();

	const STOCKHOLMS_JGP = '/junior/stockholms-jgp';

	let t = $derived(getTranslation(language.current));
	let items = $derived([{ id: 'stockholms-jgp', label: t.pages.junior.navigation.stockholmsJgp }]);
</script>

<PageLayout maxWidth="5xl">
	<div class="mb-6 lg:hidden">
		<SelectableList
			variant="dropdown"
			{items}
			selectedId="stockholms-jgp"
			onSelect={() => goto(STOCKHOLMS_JGP)}
			placeholder={t.pages.junior.navigation.stockholmsJgp}
		/>
	</div>

	<div class="flex flex-row gap-8">
		<div class="hidden w-56 flex-shrink-0 lg:block">
			<div class="sticky top-24">
				<SelectableList
					variant="vertical"
					{items}
					selectedId="stockholms-jgp"
					onSelect={() => goto(STOCKHOLMS_JGP)}
					placeholder={t.pages.junior.navigation.stockholmsJgp}
				/>
			</div>
		</div>

		<div class="min-w-0 flex-1">
			{@render children()}
		</div>
	</div>
</PageLayout>
