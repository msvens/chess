<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import { language, initLanguage } from '$lib/stores/language.svelte';
	import { theme, initTheme } from '$lib/stores/theme.svelte';
	import { setOrganizationsState } from '$lib/stores/organizations.svelte';
	import { brand, centerItems, rightItems } from '$lib/components/layout/nav';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';

	let { children } = $props();

	// The layout owns the side effects; the stores themselves stay effect-free.
	const organizations = setOrganizationsState();

	onMount(() => {
		initTheme();
		initLanguage();
		organizations.load();
	});

	// Apply the resolved theme to <html> (Tailwind class-based dark mode). The
	// pre-paint script in app.html already set this, so this only keeps it in sync
	// after a toggle.
	$effect(() => {
		document.documentElement.classList.toggle('dark', theme.current === 'dark');
	});

	// The Next app hardcoded lang="en" while defaulting to Swedish.
	$effect(() => {
		document.documentElement.lang = language.current;
	});

	// Rebuilt whenever the language or theme changes — every label is translated and
	// the two toggles advertise the state they'd switch to.
	let center = $derived(centerItems(language.current));
	let right = $derived(
		rightItems(
			language.current,
			theme.current,
			() => theme.toggle(),
			() => language.toggle()
		)
	);
</script>

<Navbar {brand} display="text" centerItems={center} rightItems={right} />

<main class="min-h-screen">
	{@render children()}
</main>

<Footer />
