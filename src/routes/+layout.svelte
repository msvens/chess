<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import { language, initLanguage } from '$lib/stores/language.svelte';
	import { theme, initTheme } from '$lib/stores/theme.svelte';
	import { setOrganizationsState } from '$lib/stores/organizations.svelte';

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

	// The Next app hardcoded lang="en" while defaulting to Swedish. Bind it properly.
	$effect(() => {
		document.documentElement.lang = language.current;
	});
</script>

<main class="min-h-screen">
	{@render children()}
</main>
