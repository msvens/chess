<script lang="ts">
	/**
	 * The on-screen controls for the print page, hidden in the printed output.
	 * Ports `components/print/PrintToolbar.tsx`.
	 *
	 * Two rows: what to print (back, class, group, round, all groups), then how
	 * to print it and the action itself.
	 */
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Link from '$lib/components/ui/Link.svelte';
	import SelectableList from '$lib/components/ui/SelectableList.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import type { FontMode } from '$lib/print/printStyle';
	import { language } from '$lib/stores/language.svelte';
	import { getTranslation } from '$lib/translations';

	interface PrintToolbarProps {
		rounds: number[];
		selectedRound: number;
		onRoundChange: (round: number) => void;
		fontMode: FontMode;
		onFontModeChange: (mode: FontMode) => void;
		auto: boolean;
		onAutoChange: (value: boolean) => void;
		allGroups: boolean;
		onAllGroupsChange: (value: boolean) => void;
		classOptions: { id: number; label: string; firstGroupId: number }[];
		currentClassId: number | null;
		groupOptions: { id: number; label: string }[];
		groupId: number;
		tournamentId: number;
	}

	let {
		rounds,
		selectedRound,
		onRoundChange,
		fontMode,
		onFontModeChange,
		auto,
		onAutoChange,
		allGroups,
		onAllGroupsChange,
		classOptions,
		currentClassId,
		groupOptions,
		groupId,
		tournamentId
	}: PrintToolbarProps = $props();

	/** Shown as increasing letter A's — compact, and needs no label of its own. */
	const FONT_SIZES: { mode: FontMode; px: string }[] = [
		{ mode: 'small', px: '11px' },
		{ mode: 'medium', px: '14px' },
		{ mode: 'large', px: '17px' }
	];

	let t = $derived(getTranslation(language.current));
	let print = $derived(t.pages.tournamentResults.print);
	let rb = $derived(t.pages.tournamentResults.roundByRound);

	/** More than one group anywhere makes "all groups" meaningful. */
	let multipleGroups = $derived(classOptions.length > 1 || groupOptions.length > 1);
	let roundItems = $derived(rounds.map((r) => ({ id: r, label: `${rb.round} ${r}` })));

	function selectClass(id: string | number) {
		const chosen = classOptions.find((c) => c.id === Number(id));
		if (chosen) goto(`/print/${tournamentId}/${chosen.firstGroupId}`);
	}
</script>

<div
	class="mb-6 space-y-2.5 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/40 print:hidden"
>
	<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
		<Link href="/results/{tournamentId}/{groupId}" color="gray" class="text-sm">
			{print.back}
		</Link>
		<span class="text-gray-300 dark:text-gray-600">|</span>

		{#if !allGroups && classOptions.length > 1}
			<div class="w-fit max-w-[16rem] min-w-[9rem]">
				<SelectableList
					items={classOptions.map((c) => ({ id: c.id, label: c.label }))}
					selectedId={currentClassId}
					onSelect={selectClass}
					variant="dropdown"
					placeholder={print.printThisGroup}
					density="compact"
					transparent
				/>
			</div>
		{/if}

		{#if !allGroups && groupOptions.length > 1}
			<div class="w-fit max-w-[16rem] min-w-[9rem]">
				<SelectableList
					items={groupOptions}
					selectedId={groupId}
					onSelect={(id) => goto(`/print/${tournamentId}/${id}`)}
					variant="dropdown"
					placeholder={print.printThisGroup}
					density="compact"
					transparent
				/>
			</div>
		{/if}

		{#if rounds.length > 1}
			<div class="w-28">
				<SelectableList
					items={roundItems}
					selectedId={selectedRound}
					onSelect={(id) => onRoundChange(Number(id))}
					variant="dropdown"
					placeholder={rb.round}
					density="compact"
					transparent
				/>
			</div>
		{/if}

		{#if multipleGroups}
			<Toggle checked={allGroups} onChange={onAllGroupsChange} label={print.allGroups} />
		{/if}
	</div>

	<div
		class="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-gray-200 pt-2.5 dark:border-gray-700"
	>
		<span class="hidden text-sm text-gray-600 sm:inline dark:text-gray-400">{print.fontSize}:</span>
		<div
			class="inline-flex overflow-hidden rounded-md border border-gray-300 dark:border-gray-600"
			role="group"
			aria-label={print.fontSize}
		>
			{#each FONT_SIZES as size, index (size.mode)}
				<button
					type="button"
					onclick={() => onFontModeChange(size.mode)}
					title={print[size.mode]}
					aria-pressed={fontMode === size.mode}
					class="flex h-7 w-8 items-center justify-center leading-none {index > 0
						? 'border-l border-gray-300 dark:border-gray-600'
						: ''} {fontMode === size.mode
						? 'bg-blue-600 text-white'
						: 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}"
				>
					<span style="font-size: {size.px}">A</span>
				</button>
			{/each}
		</div>
		<Toggle checked={auto} onChange={onAutoChange} label={print.autoFit} />

		<Button
			variant="contained"
			color="primary"
			compact
			class="ml-auto"
			onclick={() => window.print()}
			title={print.printSaveAsPdf}
		>
			{print.printAction}
		</Button>
	</div>
</div>
