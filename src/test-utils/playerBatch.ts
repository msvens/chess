/**
 * Test double for the SDK's `PlayerService.getPlayerInfoBatch`, built on a test's
 * own `getPlayerInfo` mock.
 *
 * Tests describe players one at a time (`getPlayerInfo` answers per id and date);
 * this resolves a batch the way the SDK reports it — one result per pair, in
 * order, with found / missing / error told apart by `status` — so those tests
 * keep working now that the cache fetches through the batch.
 */
import type { BatchItemResult, PlayerInfoDto } from '$lib/api';

type GetPlayerInfo = (
	id: number,
	date: Date
) => Promise<{ status: number; data?: PlayerInfoDto | null }>;

export function batchOver(getPlayerInfo: GetPlayerInfo) {
	return (requests: { id: number; date: string }[]): Promise<BatchItemResult<PlayerInfoDto>[]> =>
		Promise.all(
			requests.map(async ({ id, date }): Promise<BatchItemResult<PlayerInfoDto>> => {
				try {
					const response = await getPlayerInfo(id, new Date(`${date}T00:00:00`));
					return response.status === 200 && response.data
						? { data: response.data, error: null, status: 200 }
						: { data: null, error: null, status: response.status };
				} catch (error) {
					return { data: null, error: String(error), status: 0 };
				}
			})
		);
}
