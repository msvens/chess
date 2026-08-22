import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';
import type { PlayerInfoDto } from '$lib/api';
import { PlayerDateCache } from '$lib/player/playerDateCache.svelte';

const player = (id: number) => ({ id, firstName: 'A', lastName: 'B' }) as PlayerInfoDto;

/**
 * The point of moving this cache to SvelteMap. In the React version the same Map
 * lived in a useRef and every write was followed by `setVersion(v => v + 1)` to
 * force a re-render, because React cannot observe ref mutation. Here a read is
 * reactive on its own, so a component showing a player's name updates when the
 * fetch lands — with no bump, and no bump to forget.
 *
 * Each test records what an effect saw over time rather than reading a `$derived`
 * afterwards: reading one outside a reactive context captures a snapshot, which
 * would pass whether or not the cache is reactive.
 */
function record<T>(read: () => T, act: () => void): T[] {
	const seen: T[] = [];
	const cleanup = $effect.root(() => {
		$effect(() => {
			seen.push(read());
		});
	});
	flushSync();
	act();
	flushSync();
	cleanup();
	return seen;
}

describe('PlayerDateCache reactivity', () => {
	it('re-runs a read when an entry is written', () => {
		const cache = new PlayerDateCache();
		const seen = record(
			() => cache.get('1-2026-08-01')?.firstName ?? 'unknown',
			() => cache.setFound('1-2026-08-01', player(1))
		);
		expect(seen).toEqual(['unknown', 'A']);
	});

	it('re-runs on a negative-cache write, so "missing" replaces the spinner', () => {
		const cache = new PlayerDateCache();
		const seen = record(
			() => cache.status('7-2026-08-01'),
			() => cache.setMissing('7-2026-08-01')
		);
		expect(seen).toEqual(['unfetched', 'missing']);
	});

	it('re-runs a `has` read, which is what gates refetching', () => {
		const cache = new PlayerDateCache();
		const seen = record(
			() => cache.has('3-2026-08-01'),
			() => cache.setMissing('3-2026-08-01')
		);
		expect(seen).toEqual([false, true]);
	});

	// Writing another key does re-run a read of an ABSENT key — SvelteMap has to
	// invalidate those, since the key it was asked about might now exist. What
	// matters is that the answer is unchanged, not that the effect stayed asleep.
	it('does not change what an unrelated key reports', () => {
		const cache = new PlayerDateCache();
		const seen = record(
			() => cache.get('1-2026-08-01')?.firstName ?? 'unknown',
			() => cache.setFound('999-2026-08-01', player(999))
		);
		expect(new Set(seen)).toEqual(new Set(['unknown']));
	});
});
