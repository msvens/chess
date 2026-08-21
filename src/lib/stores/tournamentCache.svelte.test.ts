import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TournamentDto } from '$lib/api';
import { tournamentCache } from './tournamentCache.svelte';

const tournament = (id: number) => ({ id, name: `T${id}` }) as TournamentDto;

const getTournamentFromGroupBatch = vi.fn();
vi.mock('$lib/api', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/api')>();
	return {
		...actual,
		TournamentService: class {
			getTournamentFromGroupBatch = (...args: unknown[]) => getTournamentFromGroupBatch(...args);
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
		expect(getTournamentFromGroupBatch).toHaveBeenCalledWith([200]);
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
