<!--
	English text of the About page. Ports `app/about/page.tsx`.
	Prose with markup, so a component per language rather than translation keys;
	the route picks one by the current language.
-->
<script lang="ts">
	import Link from '$lib/components/ui/Link.svelte';
</script>

<h1 class="mb-6 text-3xl font-light text-gray-900 dark:text-gray-200">About msvens chess</h1>

<div class="space-y-4 text-gray-600 dark:text-gray-400">
	<p>
		msvens chess started as a side project by an avid chess parent who frequently visits
		result.schack.se to follow tournaments, track chess statistics, and explore all the great data
		that schack.se provides.
	</p>

	<p>
		The goal from the start was to offer the same functionality as result.schack.se while focusing
		on a few key improvements:
	</p>

	<ul class="ml-6 list-outside list-disc space-y-3">
		<li>
			<span class="font-medium text-gray-700 dark:text-gray-300">Mobile experience.</span>
			result.schack.se wasn't built for the mobile era, yet during tournaments a phone is often all you
			have. msvens chess takes a mobile-first approach.
		</li>
		<li>
			<span class="font-medium text-gray-700 dark:text-gray-300">Multi-lingual support.</span>
			Many chess players and parents in Sweden aren't native Swedish speakers. Making the site bilingual
			was a clear priority.
		</li>
		<li>
			<span class="font-medium text-gray-700 dark:text-gray-300">Better filtering and search.</span>
			With hundreds of tournaments running simultaneously across Sweden, finding the right one can be
			challenging. The same applies within tournaments — some have multiple classes and many groups, making
			navigation difficult.
		</li>
		<li>
			<span class="font-medium text-gray-700 dark:text-gray-300">Data compatibility.</span>
			Elo performances, scores, and other statistics should match what result.schack.se shows.
		</li>
	</ul>

	<p>
		The long-term hope is that this project might evolve into a more official results portal for
		schack.se. It would also be exciting to integrate functionality from the various chess districts
		and federations.
	</p>

	<p>
		This project wouldn't have been possible without the great people at schack.se. They've provided
		excellent APIs, are incredibly helpful with questions, and are always willing to accommodate
		requests.
	</p>

	<div class="pt-6">
		<h2 class="mb-4 text-xl font-medium text-gray-900 dark:text-gray-200">
			Links & Acknowledgments
		</h2>
		<ul class="ml-2 list-inside list-disc space-y-2">
			<li>
				<Link href="https://schack.se/" external>schack.se</Link> — the official Swedish Chess Federation
				website
			</li>
			<li>
				<Link href="https://resultat.schack.se/" external>resultat.schack.se</Link> — the official results
				portal
			</li>
			<li>
				<Link href="https://www.stockholmsschack.se/" external>stockholmsschack.se</Link> — the Stockholm
				Chess Federation
			</li>
			<li>
				<Link href="https://claude.ai/code" external>Claude Code</Link> — made building this a bit easier
				:)
			</li>
		</ul>
	</div>

	<p class="pt-4">And finally, thanks to everyone who has tested the site and provided feedback!</p>
</div>
