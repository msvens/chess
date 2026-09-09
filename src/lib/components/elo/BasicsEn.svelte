<!--
	English text of the Elo "Basics" page. Ports `app/elo/basics/page.tsx`.
	Prose with markup, so a component per language rather than translation keys;
	the route picks one by the current language.
-->
<div class="space-y-8">
	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Why Ratings Exist</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			Chess ratings provide an objective measure of playing strength, making it possible to pair
			opponents of similar skill, seed tournaments, and track improvement over time. The system was
			developed by Hungarian-American physicist Arpad Elo in the 1960s and adopted by FIDE (the
			World Chess Federation) in 1970. Today, virtually every national federation uses FIDE Elo
			ratings as their official rating system.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">
			The Three FIDE Categories
		</h2>
		<p class="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">
			FIDE maintains three separate rating lists, each for a different time control. A player can
			have different ratings in each category.
		</p>

		<div class="grid gap-4 sm:grid-cols-3">
			<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
				<h3 class="mb-1 font-semibold text-gray-900 dark:text-gray-200">Standard</h3>
				<p class="mb-2 text-sm text-gray-500 dark:text-gray-400">&gt; 60 min per player</p>
				<p class="text-sm text-gray-700 dark:text-gray-300">
					The classical time control. Most prestigious and historically the only rated format.
					Typical controls are 90 min + 30 sec/move.
				</p>
			</div>
			<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
				<h3 class="mb-1 font-semibold text-gray-900 dark:text-gray-200">Rapid</h3>
				<p class="mb-2 text-sm text-gray-500 dark:text-gray-400">10&ndash;60 min per player</p>
				<p class="text-sm text-gray-700 dark:text-gray-300">
					A faster format that became FIDE-rated in 2012. Common controls include 15 min + 10
					sec/move or 25 min + 5 sec/move.
				</p>
			</div>
			<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
				<h3 class="mb-1 font-semibold text-gray-900 dark:text-gray-200">Blixt</h3>
				<p class="mb-2 text-sm text-gray-500 dark:text-gray-400">3&ndash;10 min per player</p>
				<p class="text-sm text-gray-700 dark:text-gray-300">
					The fastest rated format. Popular online and in over-the-board events. Typical controls
					are 3 min + 2 sec/move or 5 min + 0.
				</p>
			</div>
		</div>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Rating Scale</h2>
		<p class="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">
			Elo ratings are numbers typically ranging from about 1000 to 2900. The upper brackets
			correspond to official FIDE titles:
		</p>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-gray-200 dark:border-gray-700">
						<th class="py-2 pr-4 text-left font-semibold text-gray-900 dark:text-gray-200"
							>Rating</th
						>
						<th class="py-2 text-left font-semibold text-gray-900 dark:text-gray-200">Level</th>
					</tr>
				</thead>
				<tbody class="text-gray-700 dark:text-gray-300">
					<tr class="border-b border-gray-100 dark:border-gray-800">
						<td class="py-2 pr-4">2500+</td>
						<td class="py-2">Grandmaster (GM)</td>
					</tr>
					<tr class="border-b border-gray-100 dark:border-gray-800">
						<td class="py-2 pr-4">2400&ndash;2499</td>
						<td class="py-2">International Master (IM)</td>
					</tr>
					<tr class="border-b border-gray-100 dark:border-gray-800">
						<td class="py-2 pr-4">2300&ndash;2399</td>
						<td class="py-2">FIDE Master (FM)</td>
					</tr>
					<tr class="border-b border-gray-100 dark:border-gray-800">
						<td class="py-2 pr-4">2200&ndash;2299</td>
						<td class="py-2">Candidate Master (CM)</td>
					</tr>
					<tr class="border-b border-gray-100 dark:border-gray-800">
						<td class="py-2 pr-4">1400&ndash;2199</td>
						<td class="py-2"
							>Club and tournament players &mdash; a wide range from newcomers to experienced
							competitors</td
						>
					</tr>
					<tr>
						<td class="py-2 pr-4">&lt; 1400</td>
						<td class="py-2">Typically a player who has not yet received an official FIDE rating</td
						>
					</tr>
				</tbody>
			</table>
		</div>
		<p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
			<strong>A note on online ratings.</strong> Chess.com and Lichess use their own rating systems (Glicko/Glicko-2),
			not the Elo system. These ratings have no direct relationship to FIDE Elo ratings and are generally
			higher for the same playing strength. There is no reliable conversion between them.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">
			LASK &mdash; Sweden&apos;s Old Rating System
		</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			Before September 2016, the Swedish Chess Federation (SSF) maintained its own national rating
			system called <strong>LASK</strong>. It was broadly similar to Elo but had its own formula and
			scale. In September 2016, SSF switched entirely to FIDE Elo ratings for all official purposes.
			LASK ratings are still visible in historical data but are no longer updated.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">
			When Are Ratings Updated?
		</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			FIDE publishes updated rating lists on the 1st of every month. Tournament organizers submit
			results to their national federation, which forwards them to FIDE. There can be a delay of a
			few weeks between a tournament ending and the results appearing in the monthly list.
		</p>
	</section>
</div>
