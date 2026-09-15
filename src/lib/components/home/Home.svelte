<script lang="ts">
	/**
	 * The front page. Ports `app/page.tsx`: a hero, links into the four main
	 * sections, the data partners, and shortcuts to the other language and theme.
	 */
	import {
		BuildingOffice2,
		Calendar,
		Icon,
		Trophy,
		User,
		type IconSource
	} from 'svelte-hero-icons';
	import { language } from '$lib/stores/language.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { getTranslation } from '$lib/translations';

	interface Section {
		href: string;
		icon: IconSource;
		title: string;
		description: string;
	}

	let t = $derived(getTranslation(language.current).home);

	let sections: Section[] = $derived([
		{ href: '/calendar', icon: Calendar, ...t.cards.calendar },
		{ href: '/results', icon: Trophy, ...t.cards.results },
		{ href: '/players', icon: User, ...t.cards.players },
		{ href: '/organizations', icon: BuildingOffice2, ...t.cards.organizations }
	]);

	// The federation ships a logo variant per theme.
	let schackSeLogo = $derived(
		theme.current === 'dark' ? '/partners/schack-se-dark.png' : '/partners/schack-se-light.png'
	);

	const partnerLinkClass =
		'rounded-lg border border-gray-200 p-5 transition-colors hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-500';
	const partnerHeadingClass =
		'mb-3 text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400';
	const preferenceClass = 'underline hover:text-gray-900 dark:hover:text-gray-200';
</script>

<div class="mb-16 text-center md:mb-24">
	<h1 class="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-gray-200">
		{t.hero.title}
		{t.hero.titleHighlight}
	</h1>
	<p class="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400">{t.hero.subtitle}</p>
</div>

<div
	class="mx-auto flex max-w-3xl flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-20"
>
	<nav class="mx-auto w-full max-w-md min-w-0 flex-1 space-y-8 lg:mx-0">
		{#each sections as section (section.href)}
			<a href={section.href} class="group flex items-center gap-4">
				<div
					class="text-gray-400 transition-colors group-hover:text-gray-900 dark:text-gray-500 dark:group-hover:text-gray-200"
				>
					<Icon src={section.icon} class="h-8 w-8 stroke-[1.5]" aria-hidden="true" />
				</div>
				<div>
					<div class="font-medium text-gray-900 group-hover:underline dark:text-gray-200">
						{section.title}
					</div>
					<div class="text-sm text-gray-500 dark:text-gray-400">{section.description}</div>
				</div>
			</a>
		{/each}
	</nav>

	<aside class="mx-auto w-full max-w-md space-y-8 lg:mx-0 lg:w-72 lg:flex-shrink-0">
		<div>
			<h3 class={partnerHeadingClass}>{t.partners.collaborationLabel}</h3>
			<a
				href="https://schack.se/"
				target="_blank"
				rel="noopener noreferrer"
				class="block {partnerLinkClass}"
			>
				<img
					src={schackSeLogo}
					alt="Sveriges Schackförbund"
					width="646"
					height="120"
					class="h-auto w-full"
				/>
			</a>
		</div>

		<div>
			<h3 class={partnerHeadingClass}>{t.partners.usingLabel}</h3>
			<a
				href="https://www.fide.com/"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-block {partnerLinkClass}"
			>
				<img src="/partners/fide.svg" alt="FIDE" width="124" height="87" class="h-auto w-32" />
			</a>
		</div>
	</aside>
</div>

<div class="mt-16 text-center text-sm text-gray-500 dark:text-gray-400">
	<button type="button" onclick={() => language.toggle()} class={preferenceClass}>
		{t.preferences.otherLanguage}
	</button>
	·
	<button type="button" onclick={() => theme.toggle()} class={preferenceClass}>
		{theme.current === 'dark' ? t.preferences.lightMode : t.preferences.darkMode}
	</button>
</div>
