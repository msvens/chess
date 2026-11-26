<script lang="ts">
	/**
	 * A page with a large QR code to a group's results, to put up in the hall
	 * or on the tables: the sheet header, the code, its address for whoever
	 * would rather type, and a line saying what it is for.
	 */
	import type { Snippet } from 'svelte';
	import GroupQrCode from '$lib/components/results/GroupQrCode.svelte';
	import { SITE_URL } from '$lib/seo/sitemap';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface QrSheetProps {
		/** The group page's path, e.g. `/results/7457/12345`. */
		path: string;
		/** Tournament, class and dates, as on the group's other sheets. */
		sheetHeader: Snippet;
		/** The group's name when the class has several. */
		groupSuffix: string;
	}

	let { path, sheetHeader, groupSuffix }: QrSheetProps = $props();

	let print = $derived(getTranslation(language.current).pages.tournamentResults.print);
	let shown = $derived(`${SITE_URL}${path}`.replace(/^https?:\/\//, ''));
</script>

<div class="print-page text-black">
	{@render sheetHeader()}
	{#if groupSuffix}<h2 class="text-base font-bold">{groupSuffix}</h2>{/if}
	<div class="mt-16 flex flex-col items-center gap-4 text-center">
		<GroupQrCode {path} class="h-[13cm] w-[13cm]" />
		<p class="text-xl font-semibold">{print.qrScan}</p>
		<p class="text-base">{shown}</p>
	</div>
</div>
