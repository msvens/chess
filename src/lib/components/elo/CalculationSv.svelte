<!--
	Swedish text of the Elo "Calculation" page. Ports `app/elo/calculation/page.tsx`.
	Prose with markup, so a component per language rather than translation keys;
	the route picks one by the current language.
-->
<div class="space-y-8">
	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Förväntat resultat</h2>
		<p class="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">
			Grunden i Elo-systemet är det <em>förväntade resultatet</em> &mdash; en förutsägelse av hur sannolikt
			det är att du tar poäng mot en given motståndare. Formeln är:
		</p>
		<div
			class="rounded-lg bg-gray-50 p-4 text-center font-mono text-sm text-gray-900 dark:bg-gray-800/50 dark:text-gray-200"
		>
			E = 1 / (1 + 10<sup>(R<sub>motståndare</sub> - R<sub>spelare</sub>) / 400</sup>)
		</div>
		<p class="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">
			Där <code class="text-sm">E</code> är det förväntade resultatet (mellan 0 och 1), och ratingarna
			är FIDE Elo-ratingar. Ett förväntat resultat på 0,75 innebär att du förväntas ta 75% &mdash; ungefär
			att vinna 3 av 4 partier.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Ratingförändring</h2>
		<p class="mb-3 leading-relaxed text-gray-700 dark:text-gray-300">
			Efter ett parti ändras din rating baserat på hur ditt faktiska resultat jämförs med det
			förväntade:
		</p>
		<div
			class="rounded-lg bg-gray-50 p-4 text-center font-mono text-sm text-gray-900 dark:bg-gray-800/50 dark:text-gray-200"
		>
			&Delta;R = K &times; (S - E)
		</div>
		<p class="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">Där:</p>
		<ul class="list-inside list-disc space-y-1 text-gray-700 dark:text-gray-300">
			<li><strong>&Delta;R</strong> = ratingförändring (positiv eller negativ)</li>
			<li><strong>K</strong> = K-faktor (bestämmer känsligheten, se Detaljerna)</li>
			<li><strong>S</strong> = faktiskt resultat (1 för vinst, 0,5 för remi, 0 för förlust)</li>
			<li><strong>E</strong> = förväntat resultat (från formeln ovan)</li>
		</ul>
		<p class="mt-3 leading-relaxed text-gray-700 dark:text-gray-300">
			Om du slår en starkare motståndare är <code class="text-sm">S - E</code> stort och positivt,
			så du vinner många poäng. Om du förlorar mot en svagare motståndare är
			<code class="text-sm">S - E</code> stort och negativt, så du tappar många poäng.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">400-poängstaket</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			FIDE tillämpar ett tak: om ratingskillnaden mellan två spelare överstiger 400 behandlas den
			som exakt 400 vid beräkning. Det innebär att det förväntade resultatet alltid ligger mellan
			cirka 8% och 92%, vilket förhindrar extrema ratingförändringar när en mycket starkare spelare
			möter en mycket svagare.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-200">Prestationsrating</h2>
		<p class="leading-relaxed text-gray-700 dark:text-gray-300">
			En prestationsrating uppskattar vilken rating du &ldquo;spelade på&rdquo; i en turnering. Den
			beräknas som motståndarnas genomsnittliga rating justerad efter din poängprocent. Att ta 50%
			mot motståndare med en snittrating på 2000 ger en prestationsrating på 2000. Tar du över 50%
			blir den högre; under 50% blir den lägre.
		</p>
	</section>
</div>
