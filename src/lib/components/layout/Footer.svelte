<script lang="ts">
	/**
	 * Site footer: three centred, uppercase links. Ports `components/Footer.tsx`.
	 */
	import Link from '$lib/components/ui/Link.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let t = $derived(getTranslation(language.current));

	const linkClass =
		'mx-2 text-xs font-light uppercase text-gray-600 transition-colors hover:text-gray-900 sm:text-sm dark:text-gray-400 dark:hover:text-white';
</script>

<footer class="w-full">
	<div class="mx-auto flex max-w-7xl items-center justify-center px-4 py-6">
		<Link href="/about" class={linkClass}>{t.footer.navigation.about}</Link>
		<Link href="/contact" class={linkClass}>{t.footer.navigation.contact}</Link>
		<Link href="/changelog" class={linkClass}>{t.footer.navigation.changelog}</Link>
	</div>
</footer>
