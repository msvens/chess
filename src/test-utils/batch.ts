/**
 * Test doubles for the SDK's batch methods, which report each result through
 * `options.onItem` as it resolves and also return them all, one per input.
 *
 * The app's caches store results through `onItem`, so a double that only
 * returns an array would leave them empty. These keep that contract.
 */
import type { BatchItemResult, BatchOptions, PlayerInfoDto } from '$lib/api';

type GetPlayerInfo = (
	id: number,
	date: Date
) => Promise<{ status: number; data?: PlayerInfoDto | null }>;

/**
 * `getPlayerInfoBatch` built on a test's own `getPlayerInfo` mock. Tests
 * describe players one at a time; this resolves a batch the way the SDK reports
 * it — found / missing / error told apart by `status` — firing `onItem` per
 * player in completion order.
 */
export function batchOver(getPlayerInfo: GetPlayerInfo) {
	return (
		requests: { id: number; date: string }[],
		options?: BatchOptions<PlayerInfoDto>
	): Promise<BatchItemResult<PlayerInfoDto>[]> =>
		Promise.all(
			requests.map(async ({ id, date }, index): Promise<BatchItemResult<PlayerInfoDto>> => {
				let result: BatchItemResult<PlayerInfoDto>;
				try {
					const response = await getPlayerInfo(id, new Date(`${date}T00:00:00`));
					result =
						response.status === 200 && response.data
							? { data: response.data, error: null, status: 200 }
							: { data: null, error: null, status: response.status };
				} catch (error) {
					result = { data: null, error: String(error), status: 0 };
				}
				options?.onItem?.(result, index);
				return result;
			})
		);
}

/**
 * Wrap a mock that returns a batch's results as an array (e.g. a `vi.fn` for
 * `getTournamentFromGroupBatch`) so it also fires `onItem` for each, as the SDK does.
 */
export function firingItems<T>(
	batch: (ids: number[], options?: BatchOptions<T>) => Promise<BatchItemResult<T>[]>
) {
	return async (ids: number[], options?: BatchOptions<T>): Promise<BatchItemResult<T>[]> => {
		const results = await batch(ids, options);
		results.forEach((result, index) => options?.onItem?.(result, index));
		return results;
	};
}
