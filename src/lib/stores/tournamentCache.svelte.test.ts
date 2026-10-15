import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BatchOptions, TournamentDto } from '$lib/api';
import { tournamentCache } from './tournamentCache.svelte';
import { firingItems } from '../../test-utils/batch';

const tournament = (id: number) => ({ id, name: `T${id}` }) as TournamentDto;

const getTournamentFromGroupBatch = vi.fn();
/** When set, the batch answers without calling `onItem`, like an SDK that has none. */
const silent = { on: false };
vi.mock('$lib/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api')>();
	return {
		...actual,
		TournamentService: class {
			getTournamentFromGroupBatch = (ids: number[], options?: BatchOptions<TournamentDto>) =>
				silent.on
					? getTournamentFromGroupBatch(ids)
					: firingItems<TournamentDto>((i, o) => getTournamentFromGroupBatch(i, o))(ids, options);
		}
	};
});

describe('tournamentCache', () => {
	beforeEach(() => {
		tournamentCache._reset();
		getTournamentFromGroupBatch.mockReset();
	});

	it('is empty to start with', () => {
		expect(tournamentCache.get(100)).toBeUndefined();
	});

	it('fetches missing group ids and caches them', async () => {
		getTournamentFromGroupBatch.mockResolvedValue([
			{ data: tournament(1) },
			{ data: tournament(2) }
		]);
		await tournamentCache.fetchMany([100, 200]);
		expect(tournamentCache.get(100)?.name).toBe('T1');
		expect(tournamentCache.get(200)?.name).toBe('T2');
	});

	it('asks only for the ids it does not hold', async () => {
		getTournamentFromGroupBatch.mockResolvedValue([{ data: tournament(1) }]);
		await tournamentCache.fetchMany([100]);
		getTournamentFromGroupBatch.mockClear();
		getTournamentFromGroupBatch.mockResolvedValue([{ data: tournament(2) }]);

		await tournamentCache.fetchMany([100, 200]);
		expect(getTournamentFromGroupBatch.mock.calls[0][0]).toEqual([200]);
	});

	it('stores each tournament as it arrives and counts them', async () => {
		getTournamentFromGroupBatch.mockResolvedValue([
			{ data: tournament(1), error: null, status: 200 },
			{ data: null, error: 'timeout', status: 408 }
		]);
		const progress: [number, number][] = [];
		await tournamentCache.fetchMany([100, 200], (done, total) => progress.push([done, total]));

		expect(progress).toEqual([
			[0, 2],
			[1, 2],
			[2, 2]
		]);
		expect(tournamentCache.get(100)).toBeDefined();
		// An unresolved id is still not cached, so a later attempt can succeed.
		expect(tournamentCache.get(200)).toBeUndefined();
	});

	it('stores the returned results even if no onItem call delivers them', async () => {
		// A stale bundle of an older SDK ignored the callback and left the cache empty.
		silent.on = true;
		getTournamentFromGroupBatch.mockResolvedValue([
			{ data: tournament(1), error: null, status: 200 }
		]);
		await tournamentCache.fetchMany([100]);
		silent.on = false;
		expect(tournamentCache.get(100)?.name).toBe('T1');
	});

	it('makes no request when everything is already cached', async () => {
		getTournamentFromGroupBatch.mockResolvedValue([{ data: tournament(1) }]);
		await tournamentCache.fetchMany([100]);
		getTournamentFromGroupBatch.mockClear();

		await tournamentCache.fetchMany([100]);
		expect(getTournamentFromGroupBatch).not.toHaveBeenCalled();
		expect(tournamentCache.get(100)?.name).toBe('T1');
	});

	it('skips entries the batch could not resolve rather than caching undefined', async () => {
		getTournamentFromGroupBatch.mockResolvedValue([{ data: undefined }]);
		await tournamentCache.fetchMany([999]);
		expect(tournamentCache.get(999)).toBeUndefined();
	});

	it('can be seeded from a tournament already in hand', () => {
		tournamentCache.add(100, tournament(1));
		expect(tournamentCache.get(100)?.name).toBe('T1');
	});

	it('leaves an existing entry alone when seeded again', () => {
		tournamentCache.add(100, tournament(1));
		tournamentCache.add(100, tournament(2));
		expect(tournamentCache.get(100)?.name).toBe('T1');
	});

	it('serves a seeded entry without fetching', async () => {
		tournamentCache.add(100, tournament(1));
		await tournamentCache.fetchMany([100]);
		expect(getTournamentFromGroupBatch).not.toHaveBeenCalled();
		expect(tournamentCache.get(100)?.name).toBe('T1');
	});
});
