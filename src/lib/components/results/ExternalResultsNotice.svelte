<script lang="ts">
	/**
	 * Points at the official schack.se page for a tournament format this app
	 * cannot render in full. Ports the `ExternalResultsNotice` local component in
	 * `results/[tournamentId]/[groupId]/page.tsx`.
	 *
	 * Two formats need it, for different reasons — an individually-paired team
	 * event has no team-standings endpoint at all, and a loose-team event's rows
	 * come back without club names. The copy differs; the shape does not.
	 */
	interface ExternalResultsNoticeProps {
		prefix: string;
		linkLabel: string;
		suffix: string;
		url: string;
	}

	let { prefix, linkLabel, suffix, url }: ExternalResultsNoticeProps = $props();

	// Swedish and English punctuate this differently: one language's suffix opens
	// with a comma or full stop that must hug the link, the other's is a new word.
	let spacedSuffix = $derived(/^[.,]/.test(suffix) ? suffix : ` ${suffix}`);
</script>

<div
	class="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20"
>
	<p class="text-sm text-gray-700 dark:text-gray-300">
		{prefix}
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			class="text-blue-700 underline hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
		>
			{linkLabel}
		</a>{spacedSuffix}
	</p>
</div>
