<script lang="ts">
	/**
	 * A player's identity and current ratings.
	 * Ports `components/player/PlayerInfo.tsx`.
	 *
	 * Reads translations directly, like every other domain component — the
	 * props-only rule applies to `components/ui/`, which this is not. The React
	 * version threaded a `t` object through as a prop instead.
	 */
	import Link from '$lib/components/ui/Link.svelte';
	import { birthYearOf, type PlayerInfoDto } from '$lib/api';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let { player }: { player: PlayerInfoDto } = $props();

	let t = $derived(getTranslation(language.current).pages.playerDetail);

	/**
	 * Whether the photo endpoint answered. Reset when the player changes, or a
	 * failure for one player would hide the next player's photo too.
	 */
	let failedPhotoId = $state<number | null>(null);
	let showPhoto = $derived(failedPhotoId !== player.id);

	let photoUrl = $derived(`https://resultat.schack.se/getPlayerPhoto?id=${player.id}`);
	let fullName = $derived(`${player.firstName} ${player.lastName}`);

	/** A rating of 0 means "none recorded", not "rated zero". */
	const rating = (value: number | null | undefined) => (value && value > 0 ? String(value) : '-');

	// `birthYearOf` reads the first four characters rather than parsing a Date,
	// which would shift a year-only value back a year west of UTC.
	let birthYear = $derived(birthYearOf(player.birthdate)?.toString() ?? '-');

	/** The five figures, in the order the live site lists them. */
	let ratingRows = $derived([
		{ label: t.eloRating.title, value: rating(player.elo?.rating) },
		{ label: t.eloRating.rapidRating, value: rating(player.elo?.rapidRating) },
		{ label: t.eloRating.blitzRating, value: rating(player.elo?.blitzRating) },
		{ label: t.laskRating.title, value: rating(player.lask?.rating) },
		{ label: t.eloRating.kFactor, value: rating(player.elo?.k) }
	]);
</script>

{#snippet photo(size: number)}
	<!-- A plain <img>: the Next version passed `unoptimized`, so nothing was
	     being optimised anyway. Same as the navbar's logo. -->
	<img
		src={photoUrl}
		alt={fullName}
		width={size}
		height={size}
		class="rounded object-contain"
		onerror={() => (failedPhotoId = player.id)}
	/>
{/snippet}

<div>
	<h1 class="mb-8 text-3xl font-light text-gray-900 dark:text-gray-200">{fullName}</h1>

	<div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
		{#if showPhoto}
			<div class="sm:hidden">{@render photo(160)}</div>
		{/if}

		<div class="max-w-[480px] min-w-[320px] space-y-1 text-sm">
			<!-- SSF Id and FIDE Id are the same words in both languages, so they
			     stay literal — the same reasoning as `w.o`. -->
			<div class="flex justify-between">
				<span class="text-gray-600 dark:text-gray-400">SSF Id:</span>
				<span class="font-medium text-gray-900 dark:text-gray-200">{player.id}</span>
			</div>

			<div class="flex justify-between">
				<span class="text-gray-600 dark:text-gray-400">FIDE Id:</span>
				<span class="font-medium text-gray-900 dark:text-gray-200">
					{#if player.fideid}
						<a
							href="https://ratings.fide.com/profile/{player.fideid}"
							target="_blank"
							rel="noopener noreferrer"
							class="text-blue-600 hover:underline dark:text-blue-400"
						>
							{player.fideid}
						</a>
					{:else}
						-
					{/if}
				</span>
			</div>

			<div class="flex justify-between">
				<span class="text-gray-600 dark:text-gray-400">{t.additionalInfo.birthYear}:</span>
				<span class="font-medium text-gray-900 dark:text-gray-200">{birthYear}</span>
			</div>

			<div class="flex justify-between">
				<span class="text-gray-600 dark:text-gray-400">{t.playerInfo.club}:</span>
				<span class="font-medium text-gray-900 dark:text-gray-200">
					{#if player.clubId}
						<Link href="/organizations/clubs/{player.clubId}">
							{player.club || t.playerInfo.clubFallback.replace('{id}', String(player.clubId))}
						</Link>
					{:else}
						{player.club || '-'}
					{/if}
				</span>
			</div>

			{#if player.elo?.title}
				<div class="flex justify-between">
					<span class="text-gray-600 dark:text-gray-400">{t.eloRating.fideTitle}:</span>
					<span class="font-medium text-gray-900 dark:text-gray-200">{player.elo.title}</span>
				</div>
			{/if}

			{#each ratingRows as row (row.label)}
				<div class="flex justify-between">
					<span class="text-gray-600 dark:text-gray-400">{row.label}:</span>
					<span class="font-medium text-gray-900 dark:text-gray-200">{row.value}</span>
				</div>
			{/each}
		</div>

		{#if showPhoto}
			<div class="hidden flex-shrink-0 sm:block">{@render photo(240)}</div>
		{/if}
	</div>
</div>
