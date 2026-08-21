import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLiveUpdates } from './liveUpdates.svelte';

describe('createLiveUpdates', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('does not refresh merely from being created', () => {
		const onRefresh = vi.fn().mockResolvedValue(undefined);
		createLiveUpdates({ onRefresh });
		expect(onRefresh).not.toHaveBeenCalled();
	});

	// The page has just loaded its own data; an immediate poll would refetch what
	// is already on screen.
	it('does not refresh immediately on start', () => {
		const onRefresh = vi.fn().mockResolvedValue(undefined);
		const live = createLiveUpdates({ onRefresh, pollInterval: 1000 });
		live.start();
		expect(onRefresh).not.toHaveBeenCalled();
	});

	it('polls on the interval', async () => {
		const onRefresh = vi.fn().mockResolvedValue(undefined);
		const live = createLiveUpdates({ onRefresh, pollInterval: 1000 });
		live.start();

		await vi.advanceTimersByTimeAsync(1000);
		expect(onRefresh).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(2000);
		expect(onRefresh).toHaveBeenCalledTimes(3);
	});

	it('stops polling when torn down', async () => {
		const onRefresh = vi.fn().mockResolvedValue(undefined);
		const live = createLiveUpdates({ onRefresh, pollInterval: 1000 });
		const stop = live.start();
		await vi.advanceTimersByTimeAsync(1000);
		stop();
		await vi.advanceTimersByTimeAsync(5000);
		expect(onRefresh).toHaveBeenCalledTimes(1);
	});

	it('stops polling when switched off', async () => {
		const onRefresh = vi.fn().mockResolvedValue(undefined);
		const live = createLiveUpdates({ onRefresh, pollInterval: 1000 });
		live.start();
		live.setEnabled(false);
		await vi.advanceTimersByTimeAsync(5000);
		expect(onRefresh).not.toHaveBeenCalled();
		expect(live.enabled).toBe(false);
	});

	// Switching it back on means "I want current data now", so waiting a full
	// interval would read as broken.
	it('refreshes at once when switched back on', async () => {
		const onRefresh = vi.fn().mockResolvedValue(undefined);
		const live = createLiveUpdates({ onRefresh, pollInterval: 1000 });
		live.start();
		live.setEnabled(false);
		live.setEnabled(true);
		expect(onRefresh).toHaveBeenCalledTimes(1);
	});

	it('never runs two refreshes at once', async () => {
		let release: () => void = () => {};
		const onRefresh = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));
		const live = createLiveUpdates({ onRefresh, pollInterval: 1000 });
		live.start();

		await vi.advanceTimersByTimeAsync(1000);
		await vi.advanceTimersByTimeAsync(1000);
		expect(onRefresh).toHaveBeenCalledTimes(1);

		release();
		await vi.advanceTimersByTimeAsync(1000);
		expect(onRefresh).toHaveBeenCalledTimes(2);
	});

	it('reports while a refresh is in flight', async () => {
		let release: () => void = () => {};
		const onRefresh = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));
		const live = createLiveUpdates({ onRefresh, pollInterval: 1000 });
		expect(live.isRefreshing).toBe(false);

		const pending = live.refresh();
		expect(live.isRefreshing).toBe(true);
		release();
		await pending;
		expect(live.isRefreshing).toBe(false);
	});

	it('clears the in-flight flag even when a refresh throws', async () => {
		const onRefresh = vi.fn().mockRejectedValue(new Error('network'));
		const live = createLiveUpdates({ onRefresh });
		await expect(live.refresh()).rejects.toThrow();
		expect(live.isRefreshing).toBe(false);
		// And a later refresh is not blocked by the failed one.
		onRefresh.mockResolvedValue(undefined);
		await live.refresh();
		expect(onRefresh).toHaveBeenCalledTimes(2);
	});
});
