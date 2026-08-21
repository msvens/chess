<script lang="ts">
	/**
	 * Owns the results data for one group and puts it in context.
	 *
	 * Ports `results/[tournamentId]/[groupId]/layout.tsx`, but only its lifecycle:
	 * the 348 lines of fetching and lookup helpers now live in `GroupResultsState`,
	 * which holds no effects so it can be tested on its own. What is left here is
	 * the one thing a component must do — notice the route params changing and ask
	 * the store to load.
	 *
	 * A layout rather than the page, because the standings, a player's games and a
	 * team's matches are sibling routes over the same group; sharing one load
	 * between them is the reason this level exists.
	 */
	import { untrack, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import { setGroupResultsState } from '$lib/stores/groupResults.svelte';

	let { children }: { children: Snippet } = $props();

	const results = setGroupResultsState();

	// `untrack` around the call: `load` writes the store's own state, and without
	// it those writes would be read back as dependencies of this effect.
	$effect(() => {
		const tournamentId = Number.parseInt(page.params.tournamentId ?? '', 10);
		const groupId = Number.parseInt(page.params.groupId ?? '', 10);
		untrack(() => results.load(tournamentId, groupId));
	});
</script>

{@render children()}
