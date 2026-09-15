<!--
	English text of the guide's "Tournament Formats" page. Ports
	`app/guide/formats/page.tsx`. Prose with markup, so a component per language
	rather than translation keys; the route picks one by the current language.

	The original wrapped this in `prose dark:prose-invert`, but the typography
	plugin was never installed, so those classes did nothing and are not carried.
-->
<div class="space-y-8">
	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">
			Why Different Formats?
		</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			Not all chess tournaments work the same way. The format determines how players are paired, how
			many rounds are played, and how the final ranking is decided. The choice of format depends on
			the number of participants, available time, and the purpose of the event. A small club
			championship can afford to let everyone play everyone, while a large open tournament with
			hundreds of players needs a more efficient system.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Individual Formats</h2>

		<div class="space-y-6">
			<div>
				<h3 class="mb-1 text-base font-semibold text-gray-900 dark:text-gray-200">
					Swiss System (Monrad)
				</h3>
				<p class="leading-relaxed text-gray-700 dark:text-gray-300">
					The most common format for open tournaments. Players are paired each round based on their
					current score &mdash; winners play winners, losers play losers. Everyone plays all rounds
					(typically 5&ndash;9), but you don&apos;t meet every opponent. This makes it efficient for
					large fields: a 7-round Swiss can handle over 100 players while still producing a clear
					winner. &ldquo;Monrad&rdquo; is the Scandinavian name for the same system.
				</p>
			</div>

			<div>
				<h3 class="mb-1 text-base font-semibold text-gray-900 dark:text-gray-200">
					Round Robin (Berger)
				</h3>
				<p class="leading-relaxed text-gray-700 dark:text-gray-300">
					Each player meets every other player exactly once, requiring n&minus;1 rounds for n
					players. Considered the fairest format since there are no pairing luck factors, but only
					practical for small groups of 6&ndash;12 players. Commonly used in club championships,
					elite invitationals, and league divisions.
				</p>
			</div>

			<div>
				<h3 class="mb-1 text-base font-semibold text-gray-900 dark:text-gray-200">
					Double Round Robin
				</h3>
				<p class="leading-relaxed text-gray-700 dark:text-gray-300">
					Same as Round Robin, but each pair plays twice &mdash; once with white and once with
					black. This eliminates the color advantage and gives a more reliable result. Used in
					top-level events like the Candidates Tournament and World Championship matches. Requires
					2&times;(n&minus;1) rounds, so usually limited to 6&ndash;8 players.
				</p>
			</div>

			<div>
				<h3 class="mb-1 text-base font-semibold text-gray-900 dark:text-gray-200">Knockout</h3>
				<p class="leading-relaxed text-gray-700 dark:text-gray-300">
					Lose and you&apos;re out. Often played as two-game mini-matches with tiebreak games
					(rapid, then blitz) if the match is drawn. Dramatic and decisive, but half the field is
					eliminated after one round. Used in World Cup and knockout stages of major events.
				</p>
			</div>
		</div>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Team Formats</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			In team tournaments, two teams face each other with one game per board (typically 4&ndash;8
			boards). The team result is determined by total board points (e.g. 4.5&ndash;3.5) or match
			points (win/draw/loss). Used in league play (Elitserien, division leagues) and team
			championships. The overall tournament structure can itself be Swiss or Round Robin.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Tiebreak Systems</h2>
		<p class="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">
			When players finish with the same score, tiebreak systems determine the final ranking. Several
			methods are commonly used, often in combination:
		</p>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-gray-200 dark:border-gray-700">
						<th class="py-2 pr-4 text-left font-semibold text-gray-900 dark:text-gray-200"
							>System</th
						>
						<th class="py-2 text-left font-semibold text-gray-900 dark:text-gray-200"
							>How it works</th
						>
					</tr>
				</thead>
				<tbody class="text-gray-700 dark:text-gray-300">
					<tr class="border-b border-gray-100 dark:border-gray-800">
						<td class="py-2 pr-4 font-medium">Buchholz</td>
						<td class="py-2"
							>Sum of all opponents&apos; scores. Rewards playing against strong opposition.</td
						>
					</tr>
					<tr class="border-b border-gray-100 dark:border-gray-800">
						<td class="py-2 pr-4 font-medium">Sonneborn&ndash;Berger</td>
						<td class="py-2"
							>Sum of defeated opponents&apos; scores + half of drawn opponents&apos; scores.
							Rewards beating strong players.</td
						>
					</tr>
					<tr class="border-b border-gray-100 dark:border-gray-800">
						<td class="py-2 pr-4 font-medium">Direct encounter</td>
						<td class="py-2"
							>The result between the tied players. Simple and intuitive when only two players are
							tied.</td
						>
					</tr>
					<tr>
						<td class="py-2 pr-4 font-medium">Number of wins</td>
						<td class="py-2"
							>Player with more wins ranks higher. Discourages overly cautious play.</td
						>
					</tr>
				</tbody>
			</table>
		</div>
		<p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
			The tiebreak columns shown in tournament results on this site (often labeled &ldquo;QP&rdquo;
			or &ldquo;PP&rdquo;) correspond to whichever system the tournament organizer has chosen.
		</p>
	</section>
</div>
