<script lang="ts">
	/**
	 * This month's rated games, valued in rating points: "Snabb Elo 1521 → ~1581
	 * +60". For fun — each line opens to the groups played, with the score and
	 * the points each is worth; the single games are one tap further, on the
	 * group's page for the player. The note under it says why this is not the
	 * rating yet: FIDE publishes ratings monthly, from the games reported.
	 *
	 * The SDK's `estimateMonthlyRatingChange` does the counting; this only shows
	 * it. It costs several requests and a few seconds, so it sits closed under
	 * the chart and counts only when someone opens it. The page re-creates it
	 * per player (`{#key}`), so nothing here has to reset.
	 */
	import Link from '$lib/components/ui/Link.svelte';
	import {
		estimateMonthlyRatingChange,
		parseLocalDate,
		type EstimatedGame,
		type EstimatedRatingChange
	} from '$lib/api';
	import { formatDayRange } from '$lib/dateFormat';
	import { localeOf } from '$lib/i18n';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';
	import { RATING_COLOURS } from './ratingColours';

	let { memberId }: { memberId: number } = $props();

	let estimates = $state<EstimatedRatingChange[]>([]);
	let status = $state<'closed' | 'loading' | 'done' | 'failed'>('closed');

	let translation = $derived(getTranslation(language.current));
	let t = $derived(translation.pages.playerDetail.monthlyEstimate);
	let eloLabels = $derived(translation.common.eloLabels);
	let locale = $derived(localeOf(language.current));

	/** The current month as each language writes it mid-sentence: "november", "November". */
	let monthName = $derived(new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date()));
	const withMonth = (text: string) => text.replace('{month}', monthName);

	const label = (timeControl: EstimatedRatingChange['timeControl']) =>
		({ standard: eloLabels.standard, rapid: eloLabels.rapid, blitz: eloLabels.blitz })[timeControl];

	/** A whole-point change with its sign, using a real minus. */
	function signed(value: number): string {
		const text = Math.abs(value).toFixed(0);
		return value > 0 ? `+${text}` : value < 0 ? `−${text}` : text;
	}

	interface GroupPlayed {
		tournamentId: number;
		tournamentName: string;
		groupId: number;
		first: string;
		last: string;
		games: number;
		score: number;
		/** The games' changes added up and rounded; the month's total is rounded on its own. */
		change: number;
	}

	/** One line per group, in the order first played, so a league's evenings collect. */
	function byGroup(games: EstimatedGame[]): GroupPlayed[] {
		// An array, not a map: a player's month holds a handful of groups.
		const groups: (GroupPlayed & { exact: number })[] = [];
		for (const game of games) {
			let group = groups.find((g) => g.groupId === game.groupId);
			if (!group) {
				group = {
					tournamentId: game.tournamentId,
					tournamentName: game.tournamentName,
					groupId: game.groupId,
					first: game.date,
					last: game.date,
					games: 0,
					score: 0,
					change: 0,
					exact: 0
				};
				groups.push(group);
			}
			group.last = game.date > group.last ? game.date : group.last;
			group.first = game.date < group.first ? game.date : group.first;
			group.games++;
			group.score += game.score;
			group.exact += game.change;
		}
		return groups.map(({ exact, ...group }) => ({
			...group,
			change: Math.round(exact)
		}));
	}

	const dates = (group: GroupPlayed) =>
		formatDayRange(parseLocalDate(group.first), parseLocalDate(group.last), locale, {
			showYear: false
		});

	/** 2.5 → "2½", 0.5 → "½". */
	function points(value: number): string {
		const whole = Math.floor(value);
		const half = value - whole === 0.5 ? '½' : '';
		return whole === 0 && half ? half : `${whole}${half}`;
	}

	const changeClasses = {
		up: 'text-green-700 dark:text-green-400',
		down: 'text-red-700 dark:text-red-400',
		none: 'text-gray-600 dark:text-gray-400'
	} as const;
	const changeClass = (value: number) =>
		changeClasses[value > 0 ? 'up' : value < 0 ? 'down' : 'none'];

	/** Counts on the first opening; later openings show what came back. */
	async function count(event: Event) {
		if (!(event.currentTarget as HTMLDetailsElement).open || status !== 'closed') return;
		status = 'loading';
		const response = await estimateMonthlyRatingChange(memberId);
		if (response.data) {
			estimates = response.data.estimates;
			status = 'done';
		} else {
			status = 'failed';
		}
	}
</script>

<details class="mt-4 text-sm" ontoggle={count}>
	<summary class="cursor-pointer font-medium text-gray-700 select-none dark:text-gray-300">
		{withMonth(t.title)}
	</summary>

	<div class="mt-2 ml-4">
		{#if status === 'loading'}
			<p class="text-gray-500 dark:text-gray-400">{withMonth(t.loading)}</p>
		{:else if status === 'failed'}
			<p class="text-gray-500 dark:text-gray-400">{withMonth(t.error)}</p>
		{:else if status === 'done' && estimates.length === 0}
			<p class="text-gray-500 dark:text-gray-400">{withMonth(t.empty)}</p>
		{:else if status === 'done'}
			{#each estimates as estimate (estimate.timeControl)}
				<details class="py-0.5">
					<summary class="cursor-pointer select-none">
						<span class="inline-flex flex-wrap items-baseline gap-x-2">
							<span
								aria-hidden="true"
								class="inline-block h-2 w-2 shrink-0 rounded-full"
								style="background-color: {RATING_COLOURS[estimate.timeControl]}"
							></span>
							<span class="text-gray-600 dark:text-gray-400">{label(estimate.timeControl)}</span>
							<span class="text-gray-900 tabular-nums dark:text-gray-200">
								{estimate.rating} → ~{estimate.estimatedRating}
							</span>
							<span class="font-medium tabular-nums {changeClass(estimate.change)}">
								{signed(estimate.change)}
							</span>
						</span>
					</summary>

					<ul class="mt-1 mb-2 ml-4 space-y-1.5">
						{#each byGroup(estimate.gameList) as group (group.groupId)}
							<li>
								<Link
									href="/results/{group.tournamentId}/{group.groupId}/{memberId}"
									class="block truncate"
								>
									{group.tournamentName} · {dates(group)}
								</Link>
								<span class="flex justify-between gap-2 text-gray-600 dark:text-gray-400">
									<span class="tabular-nums">
										{t.scoreOf
											.replace('{score}', points(group.score))
											.replace('{games}', String(group.games))}
									</span>
									<span class="tabular-nums {changeClass(group.change)}"
										>{signed(group.change)}</span
									>
								</span>
							</li>
						{/each}
					</ul>
				</details>
			{/each}

			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{t.note}</p>
		{/if}
	</div>
</details>
