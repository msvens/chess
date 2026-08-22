/**
 * Round-by-round standings playback.
 *
 * Scrubbing back through an event to see the table as it stood after each round.
 * Opt-in, and the snapshots are fetched the first time it is switched on — for
 * the common case (looking at the final table) nothing is requested at all.
 *
 * A factory rather than a store singleton, for the same reason as
 * `createLiveUpdates`: each results page owns one, and it holds a fetch whose
 * lifetime is the page's.
 *
 * The React version did this in an effect, which had a hazard worth naming: the
 * cleanup cancelled the in-flight request, so anything that re-ran the effect
 * left `playbackLoading` stuck on forever — its dependency array had to omit
 * that flag, with a comment explaining why. Here there is no cleanup to get
 * wrong. `ensure` is idempotent and a stale response is dropped by token, so the
 * route can call it from an effect without the effect owning cancellation.
 *
 * Every group-scoped answer takes the group id rather than trusting what was
 * loaded last: round numbers overlap between groups, so serving another group's
 * snapshots would show plausible, wrong standings instead of nothing.
 */
import { SvelteMap } from 'svelte/reactivity';
import { ResultsService, type RoundStandings } from '$lib/api';

export interface RoundStandingsPlaybackOptions {
	results?: Pick<ResultsService, 'getRoundStandings'>;
}

export function createRoundStandingsPlayback({
	results = new ResultsService()
}: RoundStandingsPlaybackOptions = {}) {
	let enabled = $state(false);
	let loading = $state(false);
	/** The group each of these describes; null when it has not happened. */
	let loadedGroupId = $state<number | null>(null);
	let failedGroupId = $state<number | null>(null);
	let pendingGroupId = $state<number | null>(null);
	// `SvelteMap` so a snapshot read is reactive on its own — the alternative,
	// swapping a plain map held in `$state`, makes every reader depend on the
	// whole set changing.
	const byRound = new SvelteMap<number, RoundStandings>();

	// Identifies the newest load; a response with a stale token belongs to a group
	// the visitor has already navigated away from.
	let token = 0;

	async function load(groupId: number): Promise<void> {
		const mine = ++token;
		pendingGroupId = groupId;
		loading = true;

		try {
			const response = await results.getRoundStandings(groupId);
			if (mine !== token) return;

			if (response.status === 200 && response.data) {
				byRound.clear();
				for (const snapshot of response.data) byRound.set(snapshot.round, snapshot);
				loadedGroupId = groupId;
			} else {
				failedGroupId = groupId;
			}
		} catch {
			if (mine === token) failedGroupId = groupId;
		} finally {
			if (mine === token) {
				loading = false;
				pendingGroupId = null;
			}
		}
	}

	return {
		get enabled() {
			return enabled;
		},
		get loading() {
			return loading;
		},

		/**
		 * Fetch this group's snapshots unless they are already held, on the way, or
		 * known to have failed.
		 *
		 * Safe to call repeatedly — the route calls it from an effect, so it runs on
		 * every dependency change. Not retrying a failure is what stops that effect
		 * from hammering a failing endpoint; toggling playback off and on again is
		 * the deliberate way to ask for another attempt.
		 */
		ensure(groupId: number): void {
			if (groupId === loadedGroupId || groupId === pendingGroupId || groupId === failedGroupId) {
				return;
			}
			void load(groupId);
		},

		/** True when this group's snapshots could not be fetched. */
		failed(groupId: number | null): boolean {
			return groupId != null && failedGroupId === groupId;
		},

		/** The snapshot after `round` for this group, or null. */
		snapshot(groupId: number | null, round: number | null): RoundStandings | null {
			if (!enabled || groupId == null || round == null || loadedGroupId !== groupId) return null;
			return byRound.get(round) ?? null;
		},

		setEnabled(next: boolean): void {
			enabled = next;
			// Switching it back on is the visitor asking for another go, so a past
			// failure is cleared rather than leaving the group poisoned for the
			// lifetime of the page.
			if (next) failedGroupId = null;
		}
	};
}

export type RoundStandingsPlayback = ReturnType<typeof createRoundStandingsPlayback>;
