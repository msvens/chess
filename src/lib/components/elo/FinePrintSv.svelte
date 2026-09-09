<!--
	Swedish text of the Elo "FinePrint" page. Ports `app/elo/fine-print/page.tsx`.
	Prose with markup, so a component per language rather than translation keys;
	the route picks one by the current language.
-->
<div class="space-y-8">
	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">
			Att få sin första rating
		</h2>
		<p class="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">
			För att få en initial FIDE-rating måste en spelare uppfylla alla följande villkor:
		</p>
		<ul class="list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
			<li>
				Spela minst <strong>5 partier</strong> mot ratade motståndare (resultat kan samlas från flera
				turneringar)
			</li>
			<li>
				Om du får noll poäng i din <strong>första turnering</strong> stryks hela den turneringen &mdash;
				du behöver spela ytterligare en
			</li>
			<li>Den resulterande ratingen måste vara minst <strong>1400</strong></li>
			<li>Slutföra de nödvändiga partierna inom en <strong>26-månadersperiod</strong></li>
			<li>Den initiala ratingen har ett tak på maximalt <strong>2200</strong></li>
		</ul>
		<p class="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">
			Den initiala ratingen beräknas med motståndarnas genomsnittliga rating plus två hypotetiska
			motståndare med 1800 i rating (räknade som remier), justerat efter din poängprocent.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">K-faktorer</h2>
		<p class="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">
			K-faktorn bestämmer hur mycket din rating ändras efter varje parti. En högre K-faktor innebär
			större svängningar. FIDE använder tre nivåer:
		</p>

		<div class="grid gap-4 sm:grid-cols-3">
			<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
				<div class="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-200">K = 40</div>
				<p class="text-sm text-gray-700 dark:text-gray-300">
					För <strong>juniorer</strong> (under 18 vid kalenderårets slut) och
					<strong>nya spelare</strong> med färre än 30 ratade partier. Möjliggör snabb ratingjustering.
				</p>
			</div>
			<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
				<div class="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-200">K = 20</div>
				<p class="text-sm text-gray-700 dark:text-gray-300">
					För spelare vars rating <strong>aldrig nått 2400</strong>. Standard-K-faktorn för de
					flesta vuxna spelare.
				</p>
			</div>
			<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
				<div class="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-200">K = 10</div>
				<p class="text-sm text-gray-700 dark:text-gray-300">
					För spelare vars rating <strong>någonsin nått 2400</strong>, även om den senare sjunkit
					under. Ger stabilitet i toppen.
				</p>
			</div>
		</div>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Juniorregeln</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			Juniorbonus med K=40 gäller till och med <strong>slutet av det kalenderår</strong> då spelaren fyller
			18. Till exempel skulle en spelare född den 15 januari 2008 ha K=40 under hela 2026 (året de fyller
			18). Från och med 1 januari 2027 sjunker de till K=20 (förutsatt att deras rating är under 2400).
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Ratinggolv</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			FIDE har ett <strong>ratinggolv på 1400</strong>. Om en spelares beräknade rating sjunker
			under 1400 visas de som orankade på FIDE:s ratinglista. Ratingen publiceras inte, men spåras
			fortfarande internt. När de presterar tillräckligt bra för att stiga över 1400 igen dyker
			ratingen upp på listan igen.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">
			Kan man förlora sin rating?
		</h2>
		<p class="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">
			Ja, det finns två sätt att i praktiken förlora sin FIDE-rating:
		</p>
		<ul class="list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
			<li>
				<strong>Sjunka under 1400:</strong> Din rating publiceras inte längre (se Ratinggolv ovan).
			</li>
			<li>
				<strong>Inaktivitet:</strong> Om du inte spelar några ratade partier på ungefär 1 år kan din rating
				bli &ldquo;inaktiv&rdquo; på FIDE:s lista. Den kan återaktiveras genom att spela ratade partier
				igen.
			</li>
		</ul>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">
			Samma regler för alla tidskontroller
		</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			K-faktorreglerna gäller identiskt för Standard-, Rapid- och Blixtratingar. Däremot har varje
			tidskontroll sin egen oberoende rating och K-faktorhistorik. En spelare kan ha K=10 för
			Standard (efter att ha nått 2400) men K=20 för Rapid (om deras rapidrating aldrig nått 2400).
		</p>
	</section>
</div>
