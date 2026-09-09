/**
 * The calculator's pure part: turning a looked-up player into a rating and a
 * K-factor for the chosen time control, and the maths for the "remove the
 * 400-point cap" switch. Split out from the component because none of it needs
 * a DOM to assert.
 */
import {
	calculateExpectedScore,
	calculateRatingChange,
	formatPlayerName,
	getKFactorForRating,
	type FideActivePlayer,
	type FidePlayer,
	type FidePlayerInfo,
	type FideRatingPeriod,
	type MemberFIDERatingDTO,
	type PlayerInfoDto
} from '$lib/api';
import {
	formatFideActivePlayerName,
	formatFidePlayerInfoName,
	formatFideSearchHitName
} from '$lib/fideNames';

export type EloType = 'standard' | 'rapid' | 'blitz';
export type GameResult = 'win' | 'draw' | 'loss';
export type InputMode = 'manual' | 'ssfId' | 'ssfSearch' | 'fideId' | 'fideSearch' | 'topPlayer';

export const ELO_TYPES: readonly EloType[] = ['standard', 'rapid', 'blitz'];
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
	/** SSF profiles carry a K per time control; FIDE data does not. */
	kFactors: PlayerKFactors | null;
	/** FIDE data carries a birth year for the junior rule; SSF data carries K instead. */
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

/** A FIDE profile with history: all three ratings from the latest period. */
export function fromFidePlayerInfo(info: FidePlayerInfo): LookedUpPlayer {
	const latest = info.history?.[0];
	return {
		name: formatFidePlayerInfoName(info),
		ratings: latest ? ratingsOfPeriod(latest) : { standard: 0, rapid: 0, blitz: 0 },
		kFactors: null,
		birthYear: info.birth_year ?? null
	};
}

function ratingsOfPeriod(period: FideRatingPeriod): PlayerRatings {
	return {
		standard: period.classical_rating ?? 0,
		rapid: period.rapid_rating ?? 0,
		blitz: period.blitz_rating ?? 0
	};
}

/**
 * A name-search hit knows only the classical rating, so this is what shows
 * until the full profile arrives.
 */
export function fromFideSearchHit(player: FidePlayer): LookedUpPlayer {
	return {
		name: formatFideSearchHitName(player),
		ratings: { standard: player.rating || 0, rapid: 0, blitz: 0 },
		kFactors: null,
		birthYear: null
	};
}

/** Likewise for a row of the top-active list. */
export function fromFideActivePlayer(player: FideActivePlayer): LookedUpPlayer {
	return {
		name: formatFideActivePlayerName(player),
		ratings: { standard: parseInt(player.rating, 10) || 0, rapid: 0, blitz: 0 },
		kFactors: null,
		birthYear: null
	};
}

/** Expected score, with or without FIDE's 400-point cap on the difference. */
export function expectedScore(player: number, opponent: number, capped: boolean): number {
	if (capped) return calculateExpectedScore(player, opponent);
	return 1 / (1 + Math.pow(10, (opponent - player) / 400));
}

export function ratingChange(
	player: number,
	opponent: number,
	actualScore: number,
	k: number,
	capped: boolean
): number {
	if (capped) return calculateRatingChange(player, opponent, actualScore, k);
	// Rounded to a tenth as the SDK does, so the two agree inside the cap.
	return Math.round(k * (actualScore - expectedScore(player, opponent, false)) * 10) / 10;
}

export function scoreOf(result: GameResult): number {
	return result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
}
