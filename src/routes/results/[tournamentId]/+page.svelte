<script lang="ts">
	/**
	 * A tournament has no page of its own — results live per group — so this
	 * resolves the tournament and forwards to its first group.
	 * Ports `app/results/[tournamentId]/page.tsx`.
	 *
	 * `replaceState` so the back button returns to wherever the visitor came from
	 * rather than bouncing them through here again.
	 */
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import { TournamentService } from '$lib/api';
	import { tournamentCache } from '$lib/stores/tournamentCache.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let error = $state<string | null>(null);

	let t = $derived(getTranslation(language.current).pages.tournamentResults);

	onMount(async () => {
		const tournamentId = Number.parseInt(page.params.tournamentId ?? '', 10);
		if (!Number.isFinite(tournamentId)) {
			error = t.errors.invalidIds;
			return;
		}

		const response = await new TournamentService().getTournament(tournamentId);
		if (response.status !== 200 || !response.data) {
			error = t.errors.tournamentFetchFailed;
			return;
		}

		const firstGroup = response.data.rootClasses?.[0]?.groups?.[0];
		if (!firstGroup) {
			error = t.noGroups;
			return;
		}

		// Seed the cache so the group page does not fetch this again.
		tournamentCache.add(firstGroup.id, response.data);
		await goto(`/results/${tournamentId}/${firstGroup.id}`, { replaceState: true });
	});
</script>

<PageLayout fullScreen>
	{#if error}
		<div class="text-center">
			<div
				class="rounded-lg border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-dark-bg"
			>
				<h1 class="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-200">{t.error}</h1>
				<p class="mb-6 text-lg text-gray-600 dark:text-gray-400">{error}</p>
			</div>
		</div>
	{:else}
		<div class="text-center">
			<div class="text-lg text-gray-600 dark:text-gray-400">{t.loading}</div>
		</div>
	{/if}
</PageLayout>
