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
		<h2 class="mb-4 text-xl font-medium text-gray-900 dark:text-gray-200">Who's Behind It</h2>
		<p>
			msvens chess is built and maintained by Martin Svensson. You can find me on
			<Link href="https://linkedin.com/in/msvens" external>LinkedIn</Link>.
		</p>
	</div>

	<div class="pt-6">
		<h2 class="mb-4 text-xl font-medium text-gray-900 dark:text-gray-200">Technical Details</h2>
		<p class="mb-3">The site is open source, and so is the library behind it:</p>
		<ul class="ml-2 list-inside list-disc space-y-2">
			<li>
				<Link href="https://github.com/msvens/chess" external>msvens/chess</Link> — this website
			</li>
			<li>
				<Link href="https://github.com/msvens/schack-se-sdk" external>msvens/schack-se-sdk</Link> — a
				TypeScript SDK for the Swedish Chess Federation's API, which also does the calculations: results,
				standings, Elo changes and performance ratings
			</li>
		</ul>

		<p class="mt-4 mb-3">The website is built with:</p>
		<ul class="ml-2 list-inside list-disc space-y-2">
			<li>
				<Link href="https://svelte.dev/docs/kit" external>SvelteKit</Link>, as a static site
				rendered in the browser
			</li>
			<li><Link href="https://svelte.dev" external>Svelte 5</Link></li>
			<li><Link href="https://www.typescriptlang.org" external>TypeScript</Link></li>
			<li><Link href="https://tailwindcss.com" external>Tailwind CSS v4</Link></li>
			<li><Link href="https://heroicons.com" external>Heroicons</Link></li>
			<li>
				<Link href="https://leafletjs.com" external>Leaflet</Link> — the club and tournament maps
			</li>
			<li><Link href="https://vitest.dev" external>Vitest</Link> — the tests</li>
		</ul>

		<p class="mt-4">
			The data comes from the Swedish Chess Federation's API at schack.se, and FIDE ratings from
			<Link href="https://chesstools.org" external>ChessTools</Link>.
		</p>
	</div>

	<div class="pt-6">
		<h2 class="mb-4 text-xl font-medium text-gray-900 dark:text-gray-200">Other Projects</h2>
		<ul class="ml-2 list-inside list-disc space-y-2">
			<li>
				<Link href="https://www.mellowtech.org" external>Mellowtech Photos</Link> — my photo blog
			</li>
			<li>
				<Link href="https://resume.msvens.com" external>Resume</Link> — my full resume
			</li>
			<li>
				<Link href="https://www.rockaden.com" external>SK Rockaden</Link> — a redesign of the Stockholm
				chess club's website: a WordPress block theme with dark mode and a Swedish/English switch (<Link
					href="https://github.com/msvens/rockaden-wp"
					external>rockaden-wp</Link
				>), and a club plugin for training, tournaments, the calendar and the Swedish Chess
				Federation's member system (<Link href="https://github.com/msvens/chess-wp-plugin" external
					>chess-wp-plugin</Link
				>)
			</li>
		</ul>
	</div>

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

	<p class="pt-4">
		A special thanks to <strong>Jon Åslund</strong>, our excellent bug hunter, whose sharp eye has
		caught many of the bugs fixed on this site.
	</p>

	<p class="pt-4">And finally, thanks to everyone who has tested the site and provided feedback!</p>
</div>
