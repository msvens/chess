<!--
	English text of the Elo "Calculation" page. Ports `app/elo/calculation/page.tsx`.
	Prose with markup, so a component per language rather than translation keys;
	the route picks one by the current language.
-->
<div class="space-y-8">
	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Expected Score</h2>
		<p class="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">
			The foundation of the Elo system is the <em>expected score</em> &mdash; a prediction of how likely
			you are to score points against a given opponent. The formula is:
		</p>
		<div
			class="rounded-lg bg-gray-50 p-4 text-center font-mono text-sm text-gray-900 dark:bg-gray-800/50 dark:text-gray-200"
		>
			E = 1 / (1 + 10<sup>(R<sub>opponent</sub> - R<sub>player</sub>) / 400</sup>)
		</div>
		<p class="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">
			Where <code class="text-sm">E</code> is the expected score (between 0 and 1), and the ratings are
			FIDE Elo ratings. An expected score of 0.75 means you&apos;re expected to score 75% &mdash; roughly
			winning 3 out of 4 games.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Rating Change</h2>
		<p class="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">
			After a game, your rating changes based on how your actual result compares to the expected
			score:
		</p>
		<div
			class="rounded-lg bg-gray-50 p-4 text-center font-mono text-sm text-gray-900 dark:bg-gray-800/50 dark:text-gray-200"
		>
			&Delta;R = K &times; (S - E)
		</div>
		<p class="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">Where:</p>
		<ul class="list-inside list-disc space-y-1 text-gray-700 dark:text-gray-300">
			<li><strong>&Delta;R</strong> = rating change (positive or negative)</li>
			<li><strong>K</strong> = K-factor (determines sensitivity, see Fine Print)</li>
			<li><strong>S</strong> = actual score (1 for win, 0.5 for draw, 0 for loss)</li>
			<li><strong>E</strong> = expected score (from the formula above)</li>
		</ul>
		<p class="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">
			If you beat a stronger opponent, <code class="text-sm">S - E</code> is large and positive, so
			you gain many points. If you lose to a weaker opponent,
			<code class="text-sm">S - E</code> is large and negative, so you lose many points.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">The 400-Point Cap</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			FIDE applies a cap: if the rating difference between two players exceeds 400, it is treated as
			exactly 400 for calculation purposes. This means the expected score is always between about 8%
			and 92%, preventing extreme rating changes when a much stronger player faces a much weaker
			one.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Performance Rating</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			A performance rating estimates what rating you &ldquo;played at&rdquo; in a tournament.
			It&apos;s calculated as the average opponent rating adjusted by your score percentage. Scoring
			50% against opponents averaging 2000 gives a performance rating of 2000. Scoring above 50%
			pushes it higher; below 50% pushes it lower.
		</p>
	</section>
</div>
