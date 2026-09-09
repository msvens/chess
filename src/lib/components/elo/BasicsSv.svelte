<!--
	Swedish text of the Elo "Basics" page. Ports `app/elo/basics/page.tsx`.
	Prose with markup, so a component per language rather than translation keys;
	the route picks one by the current language.
-->
<div class="space-y-8">
	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Varför rating finns</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			Schackratingar ger ett objektivt mått på spelstyrka, vilket gör det möjligt att lotta
			motståndare med liknande skicklighet, seeda turneringar och följa utveckling över tid.
			Systemet utvecklades av den ungersk-amerikanske fysikern Arpad Elo på 1960-talet och antogs av
			FIDE (Internationella schackförbundet) 1970. Idag använder i princip alla nationella förbund
			FIDE:s Elo-ratingar som sitt officiella ratingsystem.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">
			FIDE:s tre kategorier
		</h2>
		<p class="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">
			FIDE har tre separata ratinglistor, en för varje tidskontroll. En spelare kan ha olika
			ratingar i varje kategori.
		</p>

		<div class="grid gap-4 sm:grid-cols-3">
			<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
				<h3 class="mb-1 font-semibold text-gray-900 dark:text-gray-200">Standard</h3>
				<p class="mb-2 text-sm text-gray-500 dark:text-gray-400">&gt; 60 min per spelare</p>
				<p class="text-sm text-gray-700 dark:text-gray-300">
					Den klassiska tidskontrollen. Mest prestigefylld och historiskt den enda ratade formaten.
					Typisk betänketid är 90 min + 30 sek/drag.
				</p>
			</div>
			<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
				<h3 class="mb-1 font-semibold text-gray-900 dark:text-gray-200">Rapid</h3>
				<p class="mb-2 text-sm text-gray-500 dark:text-gray-400">10&ndash;60 min per spelare</p>
				<p class="text-sm text-gray-700 dark:text-gray-300">
					Ett snabbare format som blev FIDE-ratat 2012. Vanliga betänketider är 15 min + 10 sek/drag
					eller 25 min + 5 sek/drag.
				</p>
			</div>
			<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
				<h3 class="mb-1 font-semibold text-gray-900 dark:text-gray-200">Blixt</h3>
				<p class="mb-2 text-sm text-gray-500 dark:text-gray-400">3&ndash;10 min per spelare</p>
				<p class="text-sm text-gray-700 dark:text-gray-300">
					Det snabbaste ratade formatet. Populärt online och i brädturneringar. Typisk betänketid är
					3 min + 2 sek/drag eller 5 min + 0.
				</p>
			</div>
		</div>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Ratingskalan</h2>
		<p class="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">
			Elo-ratingar är tal som normalt sträcker sig från cirka 1000 till 2900. De övre intervallen
			motsvarar officiella FIDE-titlar:
		</p>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-gray-200 dark:border-gray-700">
						<th class="py-2 pr-4 text-left font-semibold text-gray-900 dark:text-gray-200"
							>Rating</th
						>
						<th class="py-2 text-left font-semibold text-gray-900 dark:text-gray-200">Nivå</th>
					</tr>
				</thead>
				<tbody class="text-gray-700 dark:text-gray-300">
					<tr class="border-b border-gray-100 dark:border-gray-800">
						<td class="py-2 pr-4">2500+</td>
						<td class="py-2">Stormästare (GM)</td>
					</tr>
					<tr class="border-b border-gray-100 dark:border-gray-800">
						<td class="py-2 pr-4">2400&ndash;2499</td>
						<td class="py-2">Internationell mästare (IM)</td>
					</tr>
					<tr class="border-b border-gray-100 dark:border-gray-800">
						<td class="py-2 pr-4">2300&ndash;2399</td>
						<td class="py-2">FIDE-mästare (FM)</td>
					</tr>
					<tr class="border-b border-gray-100 dark:border-gray-800">
						<td class="py-2 pr-4">2200&ndash;2299</td>
						<td class="py-2">Kandidatmästare (CM)</td>
					</tr>
					<tr class="border-b border-gray-100 dark:border-gray-800">
						<td class="py-2 pr-4">1400&ndash;2199</td>
						<td class="py-2"
							>Klubb- och turneringsspelare &mdash; ett brett spann från nykomlingar till erfarna
							tävlingsspelare</td
						>
					</tr>
					<tr>
						<td class="py-2 pr-4">&lt; 1400</td>
						<td class="py-2">Vanligtvis en spelare som ännu inte fått en officiell FIDE-rating</td>
					</tr>
				</tbody>
			</table>
		</div>
		<p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
			<strong>Om onlineratingar.</strong> Chess.com och Lichess använder egna ratingsystem (Glicko/Glicko-2),
			inte Elo-systemet. Dessa ratingar har ingen direkt koppling till FIDE:s Elo-ratingar och ligger
			generellt högre vid samma spelstyrka. Det finns ingen tillförlitlig omvandling mellan dem.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">
			LASK &mdash; Sveriges gamla ratingsystem
		</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			Före september 2016 hade Svenska Schackförbundet (SSF) sitt eget nationella ratingsystem
			kallat <strong>LASK</strong>. Det var i stort sett likt Elo men hade sin egen formel och
			skala. I september 2016 gick SSF helt över till FIDE:s Elo-ratingar för alla officiella
			ändamål. LASK-ratingar syns fortfarande i historiska data men uppdateras inte längre.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">
			När uppdateras ratingen?
		</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			FIDE publicerar uppdaterade ratinglistor den 1:a varje månad. Turneringsarrangörer skickar in
			resultat till sitt nationella förbund, som vidarebefordrar dem till FIDE. Det kan ta några
			veckor mellan att en turnering avslutas och att resultaten syns i månadslistan.
		</p>
	</section>
</div>
