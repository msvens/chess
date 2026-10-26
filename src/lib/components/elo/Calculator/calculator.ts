/**
 * The calculator's pure part: turning a looked-up player into a rating and a
 * K-factor for the chosen time control. Split out from the component because
 * none of it needs a DOM to assert. The Elo maths itself, capped or not, is the
 * SDK's.
 */
import {
	formatPlayerName,
	getKFactorForRating,
	type MemberFIDERatingDTO,
	type ApiResponse,
	type MfidePlayer,
	type MfideTopEntry,
	type MfideTopParams,
	type PlayerInfoDto
} from '$lib/api';
import { formatFidePlayerName } from '$lib/fideNames';

export type EloType = 'standard' | 'rapid' | 'blitz';
export type GameResult = 'win' | 'draw' | 'loss';
export type InputMode = 'manual' | 'ssfId' | 'ssfSearch' | 'fideId' | 'fideSearch' | 'topPlayer';

export const ELO_TYPES: readonly EloType[] = ['standard', 'rapid', 'blitz'];
/** FIDE's top lists; juniors and girls are born within the last 20 years. */
export type TopList = NonNullable<MfideTopParams['list']>;
export const TOP_LISTS: readonly TopList[] = ['open', 'women', 'juniors', 'girls'];
export const GAME_RESULTS: readonly GameResult[] = ['win', 'draw', 'loss'];
export const INPUT_MODES: readonly InputMode[] = [
	'manual',
	'ssfId',
	'ssfSearch',
	'fideId',
	'fideSearch',
	'topPlayer'
];

/** What an unrated player is calculated as, matching FIDE's rating floor. */
export const DEFAULT_RATING = 1400;

/** The K-factor used when the manual field is empty or unparseable. */
export const DEFAULT_K_FACTOR = 20;

export type PlayerRatings = Record<EloType, number>;
export type PlayerKFactors = Record<EloType, number | null>;

/**
 * Everything a lookup yields, kept per time control so switching Elo type
 * re-derives the rating instead of refetching.
 */
export interface LookedUpPlayer {
	name: string;
	ratings: PlayerRatings;
	/** A K per time control, from the SSF or FIDE profile. */
	kFactors: PlayerKFactors | null;
	/** FIDE data carries a birth year for the junior rule; SSF data does not. */
	birthYear: number | null;
}

/**
 * One side of the board: either a rating typed by hand, or a player looked up
 * from SSF or FIDE. `manualRating` is kept while a lookup is active so a mode
 * switch can carry the number across into the manual field.
 */
export interface PlayerSelection {
	manualRating: string;
	lookedUp: LookedUpPlayer | null;
}

export const EMPTY_SELECTION: PlayerSelection = { manualRating: '', lookedUp: null };

export interface ActiveRating {
	rating: number;
	/** The player had no rating of this type, so `rating` is `DEFAULT_RATING`. */
	usingDefault: boolean;
	/** The K from an SSF profile, when there is one for this type. */
	profileKFactor: number | null;
}

/** The rating and K a looked-up player has for the chosen time control. */
export function activeRating(player: LookedUpPlayer, eloType: EloType): ActiveRating {
	const raw = player.ratings[eloType];
	return {
		rating: raw > 0 ? raw : DEFAULT_RATING,
		usingDefault: raw <= 0,
		profileKFactor: player.kFactors?.[eloType] ?? null
	};
}

/** What a selection currently rates, whichever way it was entered. */
export function selectedRating(selection: PlayerSelection, eloType: EloType): ActiveRating | null {
	if (selection.lookedUp) return activeRating(selection.lookedUp, eloType);
	const rating = parseInt(selection.manualRating, 10);
	if (!(rating > 0)) return null;
	return { rating, usingDefault: false, profileKFactor: null };
}

/** The K-factor to calculate with: manual override, else profile, else estimated. */
export function resolveKFactor(
	selection: PlayerSelection,
	active: ActiveRating,
	eloType: EloType,
	manualK: string | null
): { k: number; fromProfile: boolean } {
	if (manualK != null) return { k: parseInt(manualK, 10) || DEFAULT_K_FACTOR, fromProfile: false };
	if (active.profileKFactor != null) return { k: active.profileKFactor, fromProfile: true };
	// A FIDE birth year is all the junior rule needs; January 1st is as precise as
	// the data gets and the rule works on calendar years anyway.
	const birthYear = selection.lookedUp?.birthYear;
	const birthdate = birthYear ? `${birthYear}-01-01` : null;
	return { k: getKFactorForRating(eloType, active.rating, null, birthdate), fromProfile: false };
}

export function fromSsfPlayer(player: PlayerInfoDto): LookedUpPlayer {
	return {
		name: formatPlayerName(player.firstName, player.lastName, player.elo?.title),
		ratings: {
			standard: player.elo?.rating ?? 0,
			rapid: player.elo?.rapidRating ?? 0,
			blitz: player.elo?.blitzRating ?? 0
		},
		kFactors: kFactorsOf(player.elo),
		birthYear: null
	};
}

// `|| null` rather than `?? null`: SSF sends 0 for "no K", which must read as absent.
function kFactorsOf(elo: MemberFIDERatingDTO | null | undefined): PlayerKFactors {
	return { standard: elo?.k || null, rapid: elo?.rapidk || null, blitz: elo?.blitzK || null };
}

/**
 * A FIDE player: mfide returns the same shape from lookup, search and the top
 * lists, with all three ratings and FIDE's own K for each. An unrated type is
 * `null`, read as 0 so the calculator falls back to the default rating.
 */
export function fromFidePlayer(player: MfidePlayer): LookedUpPlayer {
	return {
		name: formatFidePlayerName(player),
		ratings: {
			standard: player.standard?.rating ?? 0,
			rapid: player.rapid?.rating ?? 0,
			blitz: player.blitz?.rating ?? 0
		},
		kFactors: {
			standard: player.standard?.k ?? null,
			rapid: player.rapid?.k ?? null,
			blitz: player.blitz?.k ?? null
		},
		birthYear: player.birthYear
	};
}

/**
 * Fetches a top list once per list and rating type, so both inputs share one
 * request and switching back is instant. A failure yields an empty list and
 * isn't kept, so the next visit tries again.
 */
export function topListLoader(
	fetchTop: (list: TopList, type: EloType) => Promise<ApiResponse<MfideTopEntry[]>>
): (list: TopList, type: EloType) => Promise<MfideTopEntry[]> {
	const lists = new Map<string, Promise<MfideTopEntry[]>>();
	return (list, type) => {
		const key = `${list}:${type}`;
		let pending = lists.get(key);
		if (!pending) {
			pending = fetchTop(list, type).then((response) => {
				if (response.status === 200 && response.data) return response.data;
				lists.delete(key);
				return [];
			});
			lists.set(key, pending);
		}
		return pending;
	};
}

export function scoreOf(result: GameResult): number {
	return result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
}
