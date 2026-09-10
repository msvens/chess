<script lang="ts">
	/**
	 * The print view for a tournament group: a toolbar on screen, A4 sheets below.
	 * Ports `app/print/[tournamentId]/[groupId]/page.tsx`.
	 *
	 * The one route with no `PageLayout` — the sheets set their own A4 geometry,
	 * and the navbar and footer are hidden when printing.
	 */
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import PrintToolbar from '$lib/components/print/PrintToolbar.svelte';
	import PrintableTournament from '$lib/components/print/PrintableTournament.svelte';
	import { buildGroupNav, loadPrintData, type PrintData } from '$lib/print/printData';
	import type { FontMode } from '$lib/print/printStyle';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	let data = $state<PrintData | null>(null);
	let loading = $state(true);
	let failed = $state(false);
	let round = $state<number | null>(null);
	let fontMode = $state<FontMode>('medium');
	let auto = $state(true);
	/** Off by default: this group only. The toolbar's toggle refetches them all. */
	let allGroups = $state(false);

	let t = $derived(getTranslation(language.current).pages.tournamentResults);
	let tournamentId = $derived(Number.parseInt(page.params.tournamentId ?? '', 10));
	let groupId = $derived(Number.parseInt(page.params.groupId ?? '', 10));
	let validIds = $derived(!Number.isNaN(tournamentId) && !Number.isNaN(groupId));

	/**
	 * Refetch when the group changes or the all-groups toggle flips. `untrack`
	 * around the body so the state written below is not read back as a
	 * dependency.
	 */
	$effect(() => {
		const currentTournament = tournamentId;
		const currentGroup = groupId;
		const wantAll = allGroups;
		if (!validIds) {
			failed = true;
			loading = false;
			return;
		}
		untrack(() => load(currentTournament, wantAll ? undefined : currentGroup));
	});

	async function load(tournament: number, group: number | undefined) {
		loading = true;
		failed = false;
		try {
			const loaded = await loadPrintData(tournament, group);
			data = loaded;
			// Keep the round being looked at when it still exists — flipping "all
			// groups" recomputes the round list, and the Next app threw the
			// selection away and jumped to the last round every time.
			const available = roundsOf(loaded);
			if (round == null || !available.includes(round)) round = available.at(-1) ?? null;
		} catch {
			failed = true;
			data = null;
		} finally {
			loading = false;
		}
	}

	/** Every round present across the target groups, ascending. */
	function roundsOf(loaded: PrintData): number[] {
		return [...new Set(loaded.groups.flatMap((g) => g.rounds))].sort((a, b) => a - b);
	}

	// A group with no rounds still gets the toolbar: a Schackfyran has none, and
	// without it the page would be a dead end with no way back and no way to
	// print. The round picker hides itself when there is nothing to pick.
	let rounds = $derived(data ? roundsOf(data) : []);
	let nav = $derived(data && validIds ? buildGroupNav(data.tournament, groupId) : null);
</script>

<div class="px-4 pt-20 pb-10 print:p-0">
	{#if loading}
		<div class="text-center text-gray-600 dark:text-gray-400">{t.loading}</div>
	{:else if failed}
		<div class="text-center text-red-600 dark:text-red-400">{t.error}</div>
	{:else if data && nav}
		<PrintToolbar
			{rounds}
			selectedRound={round ?? 1}
			onRoundChange={(next) => (round = next)}
			{fontMode}
			onFontModeChange={(next) => (fontMode = next)}
			{auto}
			onAutoChange={(next) => (auto = next)}
			{allGroups}
			onAllGroupsChange={(next) => (allGroups = next)}
			classOptions={nav.classOptions}
			currentClassId={nav.currentClassId}
			groupOptions={nav.groupOptions}
			{groupId}
			{tournamentId}
		/>
		<PrintableTournament {data} round={round ?? 1} {fontMode} {auto} />
	{/if}
</div>
