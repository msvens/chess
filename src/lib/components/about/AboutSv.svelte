<!--
	Swedish text of the About page. Ports `app/about/page.tsx`.
	Prose with markup, so a component per language rather than translation keys;
	the route picks one by the current language.
-->
<script lang="ts">
	import Link from '$lib/components/ui/Link.svelte';
</script>

<h1 class="mb-6 text-3xl font-light text-gray-900 dark:text-gray-200">Om msvens schack</h1>

<div class="space-y-4 text-gray-600 dark:text-gray-400">
	<p>
		msvens schack började som ett sidoprojekt av en engagerad schackförälder som ofta besöker
		result.schack.se för att följa turneringar, hålla koll på schackstatistik och utforska all data
		som schack.se erbjuder.
	</p>

	<p>
		Målet från början var att erbjuda samma funktionalitet som result.schack.se men fokusera på
		några viktiga förbättringar:
	</p>

	<ul class="ml-6 list-outside list-disc space-y-3">
		<li>
			<span class="font-medium text-gray-700 dark:text-gray-300">Mobilupplevelse.</span>
			result.schack.se byggdes inte för mobilens tidsålder, men under turneringar är telefonen ofta det
			enda man har. msvens schack tar ett mobil-först-perspektiv.
		</li>
		<li>
			<span class="font-medium text-gray-700 dark:text-gray-300">Flerspråkigt stöd.</span>
			Många schackspelare och föräldrar i Sverige har inte svenska som modersmål. Att göra sidan tvåspråkig
			var en tydlig prioritet.
		</li>
		<li>
			<span class="font-medium text-gray-700 dark:text-gray-300"
				>Bättre filtrering och sökning.</span
			>
			Med hundratals turneringar som pågår samtidigt runt om i Sverige kan det vara svårt att hitta rätt.
			Samma sak gäller inom turneringar — vissa har flera klasser och många grupper, vilket gör navigering
			besvärlig.
		</li>
		<li>
			<span class="font-medium text-gray-700 dark:text-gray-300">Datakompatibilitet.</span>
			Elo-prestationer, poäng och annan statistik ska matcha det som result.schack.se visar.
		</li>
	</ul>

	<p>
		Den långsiktiga förhoppningen är att detta projekt kan utvecklas till en mer officiell
		resultatportal för schack.se. Det skulle också vara spännande att integrera funktionalitet från
		de olika schackdistrikten och förbunden.
	</p>

	<p>
		Detta projekt hade inte varit möjligt utan de fantastiska människorna på schack.se. De har
		tillhandahållit utmärkta API:er, är otroligt hjälpsamma med frågor och är alltid villiga att
		tillmötesgå önskemål.
	</p>

	<div class="pt-6">
		<h2 class="mb-4 text-xl font-medium text-gray-900 dark:text-gray-200">Vem står bakom?</h2>
		<p>
			msvens schack byggs och underhålls av Martin Svensson. Du hittar mig på
			<Link href="https://linkedin.com/in/msvens" external>LinkedIn</Link>.
		</p>
	</div>

	<div class="pt-6">
		<h2 class="mb-4 text-xl font-medium text-gray-900 dark:text-gray-200">Teknik</h2>
		<p class="mb-3">Sidan är öppen källkod, liksom biblioteket den bygger på:</p>
		<ul class="ml-2 list-inside list-disc space-y-2">
			<li>
				<Link href="https://github.com/msvens/chess" external>msvens/chess</Link> — den här webbplatsen
			</li>
			<li>
				<Link href="https://github.com/msvens/schack-se-sdk" external>msvens/schack-se-sdk</Link> — ett
				TypeScript-SDK för Svenska Schackförbundets API, som även gör beräkningarna: resultat, ställningar,
				Elo-förändringar och prestationsrating
			</li>
		</ul>

		<p class="mt-4 mb-3">Webbplatsen är byggd med:</p>
		<ul class="ml-2 list-inside list-disc space-y-2">
			<li>
				<Link href="https://svelte.dev/docs/kit" external>SvelteKit</Link>, som en statisk sida som
				körs i webbläsaren
			</li>
			<li><Link href="https://svelte.dev" external>Svelte 5</Link></li>
			<li><Link href="https://www.typescriptlang.org" external>TypeScript</Link></li>
			<li><Link href="https://tailwindcss.com" external>Tailwind CSS v4</Link></li>
			<li><Link href="https://heroicons.com" external>Heroicons</Link></li>
			<li>
				<Link href="https://leafletjs.com" external>Leaflet</Link> — kartorna över klubbar och turneringar
			</li>
			<li><Link href="https://vitest.dev" external>Vitest</Link> — testerna</li>
		</ul>

		<p class="mt-4">
			Data kommer från Svenska Schackförbundets API på schack.se, och FIDE-ratingen från FIDE:s
			officiella ratinglistor via
			<Link href="https://github.com/msvens/mfide" external>mfide</Link>.
		</p>
	</div>

	<div class="pt-6">
		<h2 class="mb-4 text-xl font-medium text-gray-900 dark:text-gray-200">Andra projekt</h2>
		<ul class="ml-2 list-inside list-disc space-y-2">
			<li>
				<Link href="https://www.mellowtech.org" external>Mellowtech Photos</Link> — min fotoblogg
			</li>
			<li>
				<Link href="https://resume.msvens.com" external>CV</Link> — mitt fullständiga CV
			</li>
			<li>
				<Link href="https://www.rockaden.com" external>SK Rockaden</Link> — en ny design av Stockholmsklubbens
				webbplats: ett WordPress-blocktema med mörkt läge och svensk/engelsk växling (<Link
					href="https://github.com/msvens/rockaden-wp"
					external>rockaden-wp</Link
				>), och ett klubbtillägg för träningar, turneringar, kalendern och Svenska Schackförbundets
				medlemssystem (<Link href="https://github.com/msvens/chess-wp-plugin" external
					>chess-wp-plugin</Link
				>)
			</li>
		</ul>
	</div>

	<div class="pt-6">
		<h2 class="mb-4 text-xl font-medium text-gray-900 dark:text-gray-200">Länkar & Tack</h2>
		<ul class="ml-2 list-inside list-disc space-y-2">
			<li>
				<Link href="https://schack.se/" external>schack.se</Link> — Svenska Schackförbundets officiella
				webbplats
			</li>
			<li>
				<Link href="https://resultat.schack.se/" external>resultat.schack.se</Link> — den officiella resultatportalen
			</li>
			<li>
				<Link href="https://www.stockholmsschack.se/" external>stockholmsschack.se</Link> — Stockholms
				Schackförbund
			</li>
			<li>
				<Link href="https://claude.ai/code" external>Claude Code</Link> — gjorde byggandet av detta lite
				enklare :)
			</li>
		</ul>
	</div>

	<p class="pt-4">
		Ett stort tack till <Link href="https://www.adesigner.se" external>Anna Nilsson</Link> för den vackra
		logotypen.
	</p>

	<p class="pt-4">
		Ett särskilt tack till <strong>Jon Åslund</strong>, vår utmärkta buggjägare, vars skarpa öga har
		hittat många av de buggar som rättats på sidan.
	</p>

	<p class="pt-4">Och slutligen, tack till alla som har testat sidan och gett feedback!</p>
</div>
