<script lang="ts">
	/**
	 * Tournaments being played today, each with the groups playing.
	 *
	 * The tournament leads, its groups indented under it one per line. More
	 * than {@link LISTED_GROUPS} fold away behind a count, so a league playing
	 * twenty divisions takes two lines until it is opened.
	 */
	import Link from '$lib/components/ui/Link.svelte';
	import { groupLabel } from '$lib/components/tournaments/groupLabel';
	import type { PlayedEntry } from '$lib/utils/playedDays';
	import { localeOf } from '$lib/i18n';
	import { getOrganizationsState } from '$lib/stores/organizations.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface TodayTournamentsProps {
		tournaments: PlayedEntry[];
		loading?: boolean;
		error?: string;
	}

	let { tournaments, loading = false, error }: TodayTournamentsProps = $props();

	/** Up to this many groups are listed as they are; more fold away. */
	const LISTED_GROUPS = 3;

	const organizations = getOrganizationsState();

	let translation = $derived(getTranslation(language.current));
	let t = $derived(translation.pages.today);

	let sorted = $derived(
		[...tournaments].sort((a, b) =>
			a.tournament.name.localeCompare(b.tournament.name, localeOf(language.current))
		)
	);
</script>

{#snippet groupList(tournament: PlayedEntry['tournament'], groups: PlayedEntry['groups'])}
	<ul class="mt-1 ml-4">
		{#each groups as group (group.id)}
			<li>
				<Link href="/results/{tournament.id}/{group.id}">{groupLabel(tournament, group)}</Link>
			</li>
		{/each}
	</ul>
{/snippet}

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
		{#each sorted as { tournament, groups } (tournament.id)}
			{@const organizer = organizations.getOrganizerName(tournament.orgType, tournament.orgNumber)}
			<li class="py-3">
				<h2 class="font-medium">
					<Link href="/results/{tournament.id}" color="inherit">{tournament.name}</Link>
				</h2>
				<div class="flex flex-wrap gap-x-4 text-sm text-gray-600 dark:text-gray-400">
					{#if organizer}<span>{organizer}</span>{/if}
					{#if tournament.city}<span>{tournament.city}</span>{/if}
				</div>
				{#if groups.length > LISTED_GROUPS}
					<details class="mt-1 text-sm">
						<summary class="cursor-pointer text-gray-600 select-none dark:text-gray-400">
							{t.groupsPlaying.replace('{count}', String(groups.length))}
						</summary>
						{@render groupList(tournament, groups)}
					</details>
				{:else if groups.length > 0}
					<div class="mt-1 text-sm">{@render groupList(tournament, groups)}</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
