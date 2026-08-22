import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerInfoDto } from '$lib/api';
import { playerCache } from './playerCache.svelte';

const AUG = new Date(2026, 7, 15).getTime();

const player = (id: number) => ({ id, firstName: 'A', lastName: `P${id}` }) as PlayerInfoDto;

// The store constructs its own PlayerService lazily; intercept the class so the
// tests exercise the caching, not the network.
const getPlayerInfo = vi.fn();
vi.mock('$lib/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api')>();
	return {
		...actual,
		PlayerService: class {
			getPlayerInfo = (...args: unknown[]) => getPlayerInfo(...args);
		}
	};
});

describe('playerCache', () => {
	beforeEach(() => {
		playerCache._reset();
		getPlayerInfo.mockReset();
	});

	it('reports unfetched before anything is asked for', () => {
		expect(playerCache.status(1, AUG)).toBe('unfetched');
		expect(playerCache.getByDate(1, AUG)).toBeUndefined();
	});

	it('fetches once and serves the rest from cache', async () => {
		getPlayerInfo.mockResolvedValue({ status: 200, data: player(1) });
		await playerCache.fetchByDate(1, AUG);
		await playerCache.fetchByDate(1, AUG);
		expect(getPlayerInfo).toHaveBeenCalledTimes(1);
		expect(playerCache.getByDate(1, AUG)?.lastName).toBe('P1');
		expect(playerCache.status(1, AUG)).toBe('found');
	});

	// The behaviour that stops the app hammering the API. A player with no rating
	// at a date answers 204/404; recording that as a MISS rather than leaving the
	// key absent is what prevents an endless retry loop.
	it('negative-caches a miss and does not ask again', async () => {
		getPlayerInfo.mockResolvedValue({ status: 404, data: undefined });
		await playerCache.fetchByDate(2, AUG);
		expect(playerCache.status(2, AUG)).toBe('missing');

		await playerCache.fetchByDate(2, AUG);
		expect(getPlayerInfo).toHaveBeenCalledTimes(1);
	});

	it('negative-caches a rejected request too', async () => {
		getPlayerInfo.mockRejectedValue(new Error('network'));
		await playerCache.fetchManyByDate([{ playerId: 3, date: AUG }]);
		expect(playerCache.status(3, AUG)).toBe('missing');

		await playerCache.fetchManyByDate([{ playerId: 3, date: AUG }]);
		expect(getPlayerInfo).toHaveBeenCalledTimes(1);
	});

	it('batches only the players it does not already hold', async () => {
		getPlayerInfo.mockImplementation((id: number) =>
			Promise.resolve({ status: 200, data: player(id) })
		);
		await playerCache.fetchByDate(1, AUG);
		getPlayerInfo.mockClear();

		await playerCache.fetchManyByDate([
			{ playerId: 1, date: AUG },
			{ playerId: 2, date: AUG },
			{ playerId: 3, date: AUG }
		]);
		expect(getPlayerInfo).toHaveBeenCalledTimes(2);
	});

	it('does nothing at all when every request is already cached', async () => {
		getPlayerInfo.mockResolvedValue({ status: 200, data: player(1) });
		await playerCache.fetchByDate(1, AUG);
		getPlayerInfo.mockClear();

		await playerCache.fetchManyByDate([{ playerId: 1, date: AUG }]);
		expect(getPlayerInfo).not.toHaveBeenCalled();
	});

	// Ratings are published monthly, so two dates in the same month are one entry.
	it('normalises dates to the month, so mid-month lookups share a cache entry', async () => {
		getPlayerInfo.mockResolvedValue({ status: 200, data: player(1) });
		await playerCache.fetchByDate(1, new Date(2026, 7, 3).getTime());
		await playerCache.fetchByDate(1, new Date(2026, 7, 28).getTime());
		expect(getPlayerInfo).toHaveBeenCalledTimes(1);
	});

	it('keeps different months apart', async () => {
		getPlayerInfo.mockResolvedValue({ status: 200, data: player(1) });
		await playerCache.fetchByDate(1, new Date(2026, 6, 15).getTime());
		await playerCache.fetchByDate(1, new Date(2026, 7, 15).getTime());
		expect(getPlayerInfo).toHaveBeenCalledTimes(2);
	});
});
