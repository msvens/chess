<script lang="ts">
	/**
	 * The release history. Ports `app/changelog/page.tsx`.
	 *
	 * The entries are generated from CHANGELOG.md and written in English only. The
	 * page's own headings are translated; the Next page hardcoded them in English.
	 */
	import Badge, { type BadgeColor } from '$lib/components/ui/Badge.svelte';
	import type { ChangelogEntry } from '$lib/data/changelog';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let { entries }: { entries: ChangelogEntry[] } = $props();

	let t = $derived(getTranslation(language.current).pages.changelog);

	// Keep a Changelog's section names. Anything else falls back to gray.
	const sectionColors: Partial<Record<string, BadgeColor>> = {
		Added: 'green',
		Changed: 'blue',
		Fixed: 'yellow',
		Removed: 'red',
		Infrastructure: 'purple'
	};
</script>

<h1 class="mb-2 text-3xl font-light text-gray-900 dark:text-gray-200">{t.title}</h1>
<p class="mb-8 text-gray-600 dark:text-gray-400">{t.subtitle}</p>

{#each entries as entry (entry.version)}
	<div class="mb-8 border-b border-gray-200 pb-8 last:border-0 dark:border-gray-700">
		<div class="mb-4 flex items-baseline gap-3">
			<h2 class="text-xl font-medium text-gray-900 dark:text-gray-200">
				{entry.version === 'Unreleased' ? t.unreleased : `v${entry.version}`}
			</h2>
			{#if entry.date}
				<span class="text-sm text-gray-500">{entry.date}</span>
			{/if}
		</div>
		{#each entry.sections as section (section.type)}
			<div class="mb-4">
				<Badge color={sectionColors[section.type] ?? 'gray'} shape="rounded">{section.type}</Badge>
				<ul class="mt-2 space-y-1 text-gray-600 dark:text-gray-400">
					{#each section.items as item, i (i)}
						<li class="flex items-start">
							<span class="mr-2 text-gray-400">•</span>
							<span>{item}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
{/each}
