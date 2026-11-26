<script lang="ts">
	/**
	 * A QR code pointing phones at this page, for standings on a big screen in
	 * the playing hall. Just the code, as large as the header can take: no
	 * frame, no address, no close button (the page's toggle hides it).
	 *
	 * The code always holds the public address, whichever host the page is
	 * served from: a localhost or preview address is no use on a phone.
	 */
	import QrCode from '$lib/components/ui/QrCode.svelte';
	import { SITE_URL } from '$lib/seo/sitemap';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface GroupQrCodeProps {
		/** The page's path, e.g. `/results/7457/12345`. */
		path: string;
		/** Its size; the results page's by default. */
		class?: string;
	}

	let { path, class: cls = 'h-56 w-56' }: GroupQrCodeProps = $props();

	let label = $derived(getTranslation(language.current).pages.tournamentResults.qrCode.label);
</script>

<QrCode value="{SITE_URL}{path}" {label} class="shrink-0 {cls}" />
