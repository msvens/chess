<!--
	Swedish text of the guide's "Tournament Formats" page. Ports
	`app/guide/formats/page.tsx`. Prose with markup, so a component per language
	rather than translation keys; the route picks one by the current language.

	The original wrapped this in `prose dark:prose-invert`, but the typography
	plugin was never installed, so those classes did nothing and are not carried.
-->
<div class="space-y-8">
	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">
			Varför olika format?
		</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			Inte alla schackturneringar fungerar likadant. Formatet bestämmer hur spelare lottas, hur
			många ronder som spelas och hur slutställningen avgörs. Valet av format beror på antalet
			deltagare, tillgänglig tid och syftet med tävlingen. En liten klubbmästerskapsturnering har
			råd att låta alla möta alla, medan en stor öppen turnering med hundratals spelare behöver ett
			mer effektivt system.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Individuella format</h2>

		<div class="space-y-6">
			<div>
				<h3 class="mb-1 text-base font-semibold text-gray-900 dark:text-gray-200">
					Schweizer (Monrad)
				</h3>
				<p class="leading-relaxed text-gray-700 dark:text-gray-300">
					Det vanligaste formatet för öppna turneringar. Spelare lottas varje rond baserat på
					aktuell poängställning &mdash; vinnare möter vinnare, förlorare möter förlorare. Alla
					spelar samtliga ronder (vanligtvis 5&ndash;9), men man möter inte alla motståndare. Detta
					gör systemet effektivt för stora startfält: en 7-rondsswiss kan hantera över 100 spelare
					och ändå ge en tydlig vinnare. &ldquo;Monrad&rdquo; är det skandinaviska namnet för samma
					system.
				</p>
			</div>

			<div>
				<h3 class="mb-1 text-base font-semibold text-gray-900 dark:text-gray-200">
					Rundrobbin (Berger)
				</h3>
				<p class="leading-relaxed text-gray-700 dark:text-gray-300">
					Varje spelare möter alla andra spelare exakt en gång, vilket kräver n&minus;1 ronder för n
					spelare. Anses vara det rättvisaste formatet eftersom det inte finns någon
					lottningsfaktor, men är bara praktiskt för små grupper om 6&ndash;12 spelare. Vanligt i
					klubbmästerskap, elitinbjudningar och seriedivisioner.
				</p>
			</div>

			<div>
				<h3 class="mb-1 text-base font-semibold text-gray-900 dark:text-gray-200">
					Dubbel rundrobbin
				</h3>
				<p class="leading-relaxed text-gray-700 dark:text-gray-300">
					Samma som rundrobbin, men varje par spelar två gånger &mdash; en gång med vit och en gång
					med svart. Detta eliminerar fördelarna med färgen och ger ett mer tillförlitligt resultat.
					Används i toppevenemang som Kandidatturneringen och VM-matcher. Kräver 2&times;(n&minus;1)
					ronder, så det begränsas vanligen till 6&ndash;8 spelare.
				</p>
			</div>

			<div>
				<h3 class="mb-1 text-base font-semibold text-gray-900 dark:text-gray-200">Utslagsspel</h3>
				<p class="leading-relaxed text-gray-700 dark:text-gray-300">
					Förlorar du åker du ut. Spelas ofta som tvåpartiminimatcher med särskiljande partier
					(snabb, sedan blixt) vid oavgjort. Dramatiskt och avgörande, men hälften av fältet slås ut
					efter en rond. Används i Världscupen och utslagsstadier i stora evenemang.
				</p>
			</div>
		</div>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Lagformat</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			I lagturneringar möts två lag med ett parti per bord (vanligtvis 4&ndash;8 bord).
			Lagresultatet avgörs av totala brädpoäng (t.ex. 4,5&ndash;3,5) eller matchpoäng
			(vinst/remi/förlust). Används i seriekamp (Elitserien, divisionsserier) och lagmästerskap.
			Själva turneringsstrukturen kan i sin tur vara schweizer eller rundrobbin.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Särskiljningssystem</h2>
		<p class="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">
			När spelare slutar på samma poäng avgör särskiljningssystem den slutgiltiga placeringen. Flera
			metoder används ofta i kombination:
		</p>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-gray-200 dark:border-gray-700">
						<th class="py-2 pr-4 text-left font-semibold text-gray-900 dark:text-gray-200"
							>System</th
						>
						<th class="py-2 text-left font-semibold text-gray-900 dark:text-gray-200"
							>Så fungerar det</th
						>
					</tr>
				</thead>
				<tbody class="text-gray-700 dark:text-gray-300">
					<tr class="border-b border-gray-100 dark:border-gray-800">
						<td class="py-2 pr-4 font-medium">Buchholz</td>
						<td class="py-2"
							>Summan av alla motståndares poäng. Belönar att ha mött starkt motstånd.</td
						>
					</tr>
					<tr class="border-b border-gray-100 dark:border-gray-800">
						<td class="py-2 pr-4 font-medium">Sonneborn&ndash;Berger</td>
						<td class="py-2"
							>Summan av besegrade motståndares poäng + hälften av remimotståndares poäng. Belönar
							att slå starka spelare.</td
						>
					</tr>
					<tr class="border-b border-gray-100 dark:border-gray-800">
						<td class="py-2 pr-4 font-medium">Inbördes möte</td>
						<td class="py-2"
							>Resultatet mellan de jämnställda spelarna. Enkelt och intuitivt när bara två spelare
							delar poäng.</td
						>
					</tr>
					<tr>
						<td class="py-2 pr-4 font-medium">Antal vinster</td>
						<td class="py-2"
							>Spelaren med flest vinster placeras högre. Motverkar alltför försiktigt spel.</td
						>
					</tr>
				</tbody>
			</table>
		</div>
		<p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
			Särskiljningskolumnerna i turneringsresultat på den här sidan (ofta märkta &ldquo;SP&rdquo;
			eller &ldquo;BP&rdquo;) motsvarar det system som turneringsarrangören har valt.
		</p>
	</section>
</div>
