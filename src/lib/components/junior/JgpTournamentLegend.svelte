<script lang="ts">
	/**
	 * The key to the numbered standings columns: which tournament each number is,
	 * with its date, linking to the results.
	 * Ports `components/junior/JgpTournamentLegend.tsx`.
	 */
	import Link from '$lib/components/ui/Link.svelte';
	import type { JgpTournamentRef } from '$lib/data/jgp/types';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let { tournaments }: { tournaments: JgpTournamentRef[] } = $props();

	let t = $derived(getTranslation(language.current).pages.junior);
</script>

<div class="mb-2">
	<h2 class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-200">
		{t.tournamentsHeading}
	</h2>
	<ol class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
		{#each tournaments as tournament, index (tournament.tournamentId)}
			<li class="flex gap-2">
				<span class="w-5 shrink-0 text-right text-gray-400 tabular-nums dark:text-gray-500">
					{index + 1}.
				</span>
				<Link href="/results/{tournament.tournamentId}">{tournament.label}</Link>
				<span class="text-gray-400 tabular-nums dark:text-gray-500">{tournament.date}</span>
			</li>
		{/each}
	</ol>
</div>
