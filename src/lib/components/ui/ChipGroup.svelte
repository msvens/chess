<script lang="ts" generics="T extends string">
	/**
	 * A row of buttons where one is chosen: a rating type, a game result, how
	 * to enter a player. For a handful of short options that should all stay
	 * in view, where a dropdown would hide them.
	 *
	 * Follows the app's size rule (small on phones, text-sm from md up), and
	 * marks the chosen one with `aria-pressed`.
	 */
	interface ChipGroupProps {
		items: { id: T; label: string }[];
		selectedId: T;
		onSelect: (id: T) => void;
		/** Names the group for screen readers; the chips alone don't say what they choose. */
		label: string;
	}

	let { items, selectedId, onSelect, label }: ChipGroupProps = $props();
</script>

<div class="flex flex-wrap gap-1" role="group" aria-label={label}>
	{#each items as item (item.id)}
		{@const selected = item.id === selectedId}
		<button
			type="button"
			onclick={() => onSelect(item.id)}
			aria-pressed={selected}
			class="rounded px-2.5 py-1 text-xs transition-colors md:text-sm {selected
				? 'bg-gray-200 font-medium text-gray-900 dark:bg-gray-700 dark:text-gray-200'
				: 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}"
		>
			{item.label}
		</button>
	{/each}
</div>
