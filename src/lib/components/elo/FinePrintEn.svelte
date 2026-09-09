<!--
	English text of the Elo "FinePrint" page. Ports `app/elo/fine-print/page.tsx`.
	Prose with markup, so a component per language rather than translation keys;
	the route picks one by the current language.
-->
<div class="space-y-8">
	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">
			Getting Your First Rating
		</h2>
		<p class="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">
			To receive an initial FIDE rating, a player must meet all of the following conditions:
		</p>
		<ul class="list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
			<li>
				Play at least <strong>5 games</strong> against rated opponents (results can be pooled across multiple
				tournaments)
			</li>
			<li>
				If you score zero in your <strong>first event</strong>, that entire tournament is
				disregarded &mdash; you&apos;ll need to play another event
			</li>
			<li>The resulting rating must be at least <strong>1400</strong></li>
			<li>Complete the required games within a <strong>26-month period</strong></li>
			<li>The initial rating is capped at a maximum of <strong>2200</strong></li>
		</ul>
		<p class="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">
			The initial rating is calculated using your opponents&apos; average rating plus two
			hypothetical 1800-rated opponents (counted as draws), adjusted by your score percentage.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">K-Factors</h2>
		<p class="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">
			The K-factor determines how much your rating changes after each game. A higher K-factor means
			bigger swings. FIDE uses three tiers:
		</p>

		<div class="grid gap-4 sm:grid-cols-3">
			<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
				<div class="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-200">K = 40</div>
				<p class="text-sm text-gray-700 dark:text-gray-300">
					For <strong>juniors</strong> (under 18 by end of calendar year) and
					<strong>new players</strong> with fewer than 30 rated games. Allows rapid rating adjustment.
				</p>
			</div>
			<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
				<div class="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-200">K = 20</div>
				<p class="text-sm text-gray-700 dark:text-gray-300">
					For players whose rating has <strong>never reached 2400</strong>. The standard K-factor
					for most adult players.
				</p>
			</div>
			<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
				<div class="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-200">K = 10</div>
				<p class="text-sm text-gray-700 dark:text-gray-300">
					For players whose rating has <strong>ever reached 2400</strong>, even if it later dropped
					below. Provides stability at the top.
				</p>
			</div>
		</div>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">The Junior Rule</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			The K=40 junior bonus applies through the <strong>end of the calendar year</strong> in which the
			player turns 18. For example, a player born on January 15, 2008 would have K=40 through all of 2026
			(the year they turn 18). Starting January 1, 2027, they would drop to K=20 (assuming their rating
			is below 2400).
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Rating Floor</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			FIDE has a <strong>rating floor of 1400</strong>. If a player&apos;s calculated rating drops
			below 1400, they are shown as unrated on the FIDE rating list. Their rating is not published,
			though it is still tracked internally. Once they perform well enough to rise above 1400 again,
			their rating reappears on the list.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">
			Can You Lose Your Rating?
		</h2>
		<p class="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">
			Yes, there are two ways to effectively lose your FIDE rating:
		</p>
		<ul class="list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
			<li>
				<strong>Drop below 1400:</strong> Your rating is no longer published (see Rating Floor above).
			</li>
			<li>
				<strong>Inactivity:</strong> If you don&apos;t play any rated games within approximately 1 year,
				your rating may become &ldquo;inactive&rdquo; on the FIDE list. It can be reactivated by playing
				rated games again.
			</li>
		</ul>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">
			Same Rules for All Time Controls
		</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			The K-factor rules apply identically to Standard, Rapid, and Blitz ratings. However, each time
			control has its own independent rating and K-factor history. A player could have K=10 for
			Standard (having reached 2400) but K=20 for Rapid (if their rapid rating never reached 2400).
		</p>
	</section>
</div>
