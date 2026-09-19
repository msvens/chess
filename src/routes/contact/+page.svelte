<script lang="ts">
	import PageLayout from '$lib/components/layout/PageLayout.svelte';
	import PageTitle from '$lib/components/layout/PageTitle.svelte';
	import ContactForm from '$lib/components/contact/ContactForm.svelte';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let t = $derived(getTranslation(language.current).pages.contact);

	// Inlined at build time from `VITE_FORMSPREE_ENDPOINT`, replacing Next's
	// NEXT_PUBLIC_ variable. A build without it shows the placeholder instead of
	// a form that could only fail.
	const endpoint: string | undefined = import.meta.env.VITE_FORMSPREE_ENDPOINT;
</script>

<PageLayout maxWidth="3xl">
	<PageTitle title={t.title} subtitle={t.subtitle} />
	<div class="bg-white p-8 dark:bg-dark-bg">
		<ContactForm {endpoint} />
	</div>
</PageLayout>
