/**
 * Polling for a live tournament.
 *
 * Ports `hooks/useLiveUpdates.ts`. A factory rather than a store singleton: each
 * results page owns one, and it holds a timer, so it must be startable and
 * stoppable with the page.
 *
 * The timer is deliberately NOT inside `GroupResultsState` — that class is kept
 * effect- and timer-free so it can be instantiated in a test. This is the piece
 * that owns the side effect, and the route wires the two together.
 */
export interface LiveUpdatesOptions {
	/** Milliseconds between polls. */
	pollInterval?: number;
	onRefresh: () => Promise<void>;
}

const DEFAULT_POLL_INTERVAL = 30_000;

export function createLiveUpdates({
	pollInterval = DEFAULT_POLL_INTERVAL,
	onRefresh
}: LiveUpdatesOptions) {
	let enabled = $state(true);
	let isRefreshing = $state(false);
	let timer: ReturnType<typeof setInterval> | undefined;
	// Overlapping refreshes would interleave their writes; a slow response landing
	// after a newer one is exactly the staleness GroupResultsState guards against,
	// and not starting a second request is cheaper than sorting it out afterwards.
	let inFlight = false;

	async function refresh(): Promise<void> {
		if (inFlight) return;
		inFlight = true;
		isRefreshing = true;
		try {
			await onRefresh();
		} finally {
			isRefreshing = false;
			inFlight = false;
		}
	}

	function stop(): void {
		if (timer !== undefined) clearInterval(timer);
		timer = undefined;
	}

	function start(): void {
		stop();
		if (!enabled) return;
		timer = setInterval(refresh, pollInterval);
	}

	return {
		get enabled() {
			return enabled;
		},
		get isRefreshing() {
			return isRefreshing;
		},
		/**
		 * Turning it on refreshes immediately — the visitor just asked for current
		 * data and waiting a full interval to get it would look broken. Turning it
		 * off only stops the timer.
		 */
		setEnabled(next: boolean): void {
			enabled = next;
			if (next) {
				refresh();
				start();
			} else {
				stop();
			}
		},
		refresh,
		/** Begin polling if enabled. Call from `onMount`; the returned teardown stops it. */
		start(): () => void {
			start();
			return stop;
		}
	};
}
