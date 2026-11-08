<script lang="ts">
	/**
	 * Tournaments being played today, each with the groups playing.
	 */
	import Link from '$lib/components/ui/Link.svelte';
	import { toDateString } from '$lib/components/ui/calendar';
	import type { TournamentDto } from '$lib/api';
	import { localeOf } from '$lib/i18n';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import { groupsPlayingOn } from './todayGroups';

	interface TodayTournamentsProps {
		tournaments: TournamentDto[];
		loading?: boolean;
		error?: string;
	}

	let { tournaments, loading = false, error }: TodayTournamentsProps = $props();

	const organizations = getOrganizationsState();

	let translation = $derived(getTranslation(language.current));
	let t = $derived(translation.pages.today);

	const now = new Date();
	const today = toDateString(now.getFullYear(), now.getMonth(), now.getDate());

	let sorted = $derived(
		[...tournaments].sort((a, b) => a.name.localeCompare(b.name, localeOf(language.current)))
	);
</script>

{#if loading}
	<p class="py-8 text-center text-gray-600 dark:text-gray-400">
		{translation.common.states.loading}
	</p>
{:else if error}
	<p class="py-8 text-center text-gray-600 dark:text-gray-400">{error}</p>
{:else if sorted.length === 0}
	<p class="py-8 text-center text-gray-600 dark:text-gray-400">{t.empty}</p>
{:else}
	<ul class="divide-y divide-gray-200 dark:divide-gray-700">
		{#each sorted as tournament (tournament.id)}
			{@const organizer = organizations.getOrganizerName(tournament.orgType, tournament.orgNumber)}
			{@const groups = groupsPlayingOn(tournament, today)}
			<li class="py-3">
				<h2 class="font-medium">
					<Link href="/results/{tournament.id}" color="inherit">{tournament.name}</Link>
				</h2>
				<div class="flex flex-wrap gap-x-4 text-sm text-gray-600 dark:text-gray-400">
					{#if organizer}<span>{organizer}</span>{/if}
					{#if tournament.city}<span>{tournament.city}</span>{/if}
				</div>
				{#if groups.length > 0}
					<ul class="mt-1 text-sm">
						{#each groups as group (group.id)}
							<li><Link href="/results/{tournament.id}/{group.id}">{group.label}</Link></li>
						{/each}
					</ul>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
