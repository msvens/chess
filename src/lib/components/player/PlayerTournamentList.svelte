<script lang="ts">
	/**
	 * A player's tournament history, one row per group.
	 * Ports `components/player/PlayerTournamentList.tsx`.
	 *
	 * The React version carried three densities and a resize listener to choose
	 * between them. Both of its call sites passed `density="compact"`, so the
	 * mobile detection, the thresholds prop and two of the three branches were
	 * unreachable — about 90 lines. Only the compact styling survives.
	 *
	 * Reads translations directly, like every other domain component; the
	 * props-only rule applies to `components/ui/`, which this is not.
	 */
	import Link from '$lib/components/ui/Link.svelte';
	import type { TournamentParticipation } from '$lib/player/participations';
	import { parseLocalDate } from '$lib/api';
	import { language } from '$lib/stores/language.svelte';
	import { localeOf } from '$lib/i18n';
	import { getTranslation } from '$lib/translations';

	interface PlayerTournamentListProps {
		tournaments: TournamentParticipation[];
		loading?: boolean;
		/** The games-derived data could not be fetched; the rows cannot be built. */
		failed?: boolean;
	}

	let { tournaments, loading = false, failed = false }: PlayerTournamentListProps = $props();

	let t = $derived(getTranslation(language.current).pages.playerDetail.tournamentHistory);
	let locale = $derived(localeOf(language.current));

	/**
	 * `2025-06-27` → `2025-6-27`: ISO order without the leading zeros, which is
	 * what the mobile column has room for.
	 */
	function compactDate(value: string): string {
		const date = parseLocalDate(value);
		if (Number.isNaN(date.getTime())) return value;
		return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
	}

	/** Within one year the year is said once, at the end: `6-27 - 7-6 2025`. */
	function compactRange(start: string, end: string): string {
		if (start === end) return compactDate(start);

		const from = parseLocalDate(start);
		const to = parseLocalDate(end);
		if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return `${start} - ${end}`;

		if (from.getFullYear() === to.getFullYear()) {
			return `${from.getMonth() + 1}-${from.getDate()} - ${to.getMonth() + 1}-${to.getDate()} ${to.getFullYear()}`;
		}
		return `${compactDate(start)} - ${compactDate(end)}`;
	}

	function fullDate(value: string): string {
		const date = parseLocalDate(value);
		if (Number.isNaN(date.getTime())) return value;
		return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
	}

	function fullRange(start: string, end: string): string {
		if (start === end) return fullDate(start);
		return `${fullDate(start)} - ${fullDate(end)}`;
	}

	/** A one-class event repeats itself if the class name is shown too. */
	const classLine = (row: TournamentParticipation) =>
		row.hasMultipleClasses && row.className
			? `${row.className}, ${row.groupName}`
			: row.groupName || '';
</script>

{#if loading}
	<div class="py-8 text-center">
		<div class="text-gray-600 dark:text-gray-400">{t.loading}</div>
	</div>
{:else if failed}
	<div class="py-8 text-center">
		<div class="text-gray-600 dark:text-gray-400">{t.error}</div>
	</div>
{:else if tournaments.length === 0}
	<div class="py-8 text-center">
		<div class="text-gray-600 dark:text-gray-400">{t.noTournaments}</div>
	</div>
{:else}
	<div class="text-xs">
		{#each tournaments as row, index (`${row.tournament.id}-${row.groupId}`)}
			<Link
				href="/results/{row.tournament.id}/{row.groupId}"
				color="inherit"
				underline="never"
				class="block px-3 py-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 {index <
				tournaments.length - 1
					? 'border-b border-gray-200 dark:border-gray-700'
					: ''}"
			>
				<div class="flex items-start justify-between">
					<div class="flex flex-1 flex-col gap-0">
						<h3 class="text-xs font-medium text-gray-900 dark:text-gray-200">
							{row.tournament.name}
						</h3>
						<!-- Mobile keeps the group line and a short date; the desktop row has
						     room for the spelled-out date and the city. -->
						<div class="flex flex-wrap gap-x-2 text-xs text-gray-600 md:hidden dark:text-gray-400">
							{#if classLine(row)}<span>{classLine(row)}</span>{/if}
							<span>•</span>
							<span>{compactRange(row.groupStartDate, row.groupEndDate)}</span>
						</div>
						<div
							class="hidden flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600 md:flex dark:text-gray-400"
						>
							{#if classLine(row)}<span>{classLine(row)}</span>{/if}
							<span>{fullRange(row.groupStartDate, row.groupEndDate)}</span>
							{#if row.tournament.city}<span>{row.tournament.city}</span>{/if}
						</div>
					</div>
					<div class="ml-4 flex-shrink-0 text-right">
						{#if row.isUpcoming}
							<span class="text-xs font-medium text-blue-600 dark:text-blue-400">
								{t.registered}
							</span>
						{:else}
							<div class="text-xs font-medium text-gray-900 dark:text-gray-200">
								{t.points}: {row.totalPoints}
							</div>
							<div class="text-xs text-gray-600 dark:text-gray-400">
								{t.outcome}: {row.wins}/{row.draws}/{row.losses}
							</div>
						{/if}
					</div>
				</div>
			</Link>
		{/each}
	</div>
{/if}
