/**
 * Everything the results pages for one tournament group need.
 *
 * Replaces the Next app's `results/[tournamentId]/[groupId]/layout.tsx` — a
 * 348-line component that existed to be a data layer — and the 22-field context
 * it provided. Not a transliteration: the React shape was driven by hooks rules
 * and referential stability, neither of which applies here.
 *
 * Holds state and actions only — no `$effect`, no timers — so it can be tested by
 * instantiating it. The route owns the side effects: it calls `load()` when the
 * ids change and drives refreshes.
 */
import { getContext, setContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import {
	ResultsService,
	TournamentService,
	findTournamentGroup,
	formatPlayerName,
	formatRatingWithType,
	getOpponentKind,
	getPlayerRatingByRoundType,
	getPlayerRatingStrict,
	isTeamPairing,
	isTeamTournament,
	type PlayerInfoDto,
	type RoundDto,
	type TeamTournamentEndResultDto,
	type TournamentClassGroupDto,
	type TournamentDto,
	type TournamentEndResultDto,
	type TournamentRoundResultDto
} from '$lib/api';
import { buildPlayerMap } from '$lib/results/playerMap';
import { playerCache, type PlayerDateRequest } from './playerCache.svelte';
import { tournamentCache } from './tournamentCache.svelte';
import { language } from './language.svelte';
import { getOrganizationsState, type OrganizationsState } from './organizations.svelte';
import { getTranslation } from '$lib/translations';

export type { PlayerDateRequest };

export class GroupResultsState {
	tournament = $state<TournamentDto | null>(null);
	group = $state<TournamentClassGroupDto | null>(null);

	individualResults = $state<TournamentEndResultDto[]>([]);
	individualRoundResults = $state<TournamentRoundResultDto[]>([]);
	teamResults = $state<TeamTournamentEndResultDto[]>([]);
	teamRoundResults = $state<TournamentRoundResultDto[]>([]);

	roundsMap = $state<SvelteMap<number, RoundDto>>(new SvelteMap());
	loading = $state(true);
	error = $state<string | null>(null);
	/** Epoch ms of the last successful results fetch; the UI formats it. */
	lastUpdated = $state<number | null>(null);

	#organizations: Pick<OrganizationsState, 'getClubName'>;
	#results = new ResultsService();
	#tournaments = new TournamentService();

	/**
	 * Club names come from the organizations store. Taken as an argument rather
	 * than read from context in a field initializer, so the class can be
	 * instantiated in a test — which is the whole point of keeping effects out of
	 * it. The default resolves from context, so callers inside a component still
	 * write `new GroupResultsState()`.
	 */
	constructor(organizations: Pick<OrganizationsState, 'getClubName'> = getOrganizationsState()) {
		this.#organizations = organizations;
	}

	/**
	 * Guards against a slower earlier load finishing after a later one. Switching
	 * group while a fetch is in flight is ordinary here — the sidebars invite it —
	 * so this replaces the React version's gating on each other's loading flags.
	 */
	#token = 0;

	// --- Derived ---

	get isTeamTournament(): boolean {
		return this.tournament ? isTeamTournament(this.tournament.type) : false;
	}

	/**
	 * True for Schackfyran and friends: a team competition whose pairings are
	 * individual. No team-standings endpoint exists upstream for this shape, so
	 * the page shows a notice instead of results.
	 */
	get isIndividuallyPairedTeam(): boolean {
		const type = this.tournament?.type;
		return type != null && isTeamTournament(type) && !isTeamPairing(type);
	}

	/** Teams not bound to one club (Skol-SM); rows arrive with `club: null`. */
	get isLooseTeamTournament(): boolean {
		return this.tournament?.teamtournamentPlayerListType === 3;
	}

	get tournamentState(): number | null {
		return this.tournament?.state ?? null;
	}

	get thinkingTime(): string | null {
		return this.tournament?.thinkingTime || null;
	}

	get groupName(): string | null {
		return this.group?.name ?? null;
	}

	get groupStartDate(): string | null {
		return this.group?.start ?? null;
	}

	get groupEndDate(): string | null {
		return this.group?.end ?? null;
	}

	get rankingAlgorithm(): number | null {
		return this.group?.rankingAlgorithm ?? null;
	}

	/**
	 * Players named by the individual standings, for O(1) lookup.
	 *
	 * `$derived.by` rather than a plain getter so it is computed once per change
	 * instead of on every one of the many lookups a standings table makes.
	 */
	#players = $derived.by(() => buildPlayerMap(this.individualResults));

	get playerMap(): Map<number, PlayerInfoDto> {
		return this.#players;
	}

	// --- Loading ---

	/** Tournament metadata, then the results for its type. */
	async load(tournamentId: number, groupId: number): Promise<void> {
		const t = getTranslation(language.current).pages.tournamentResults;
		if (!Number.isFinite(tournamentId) || !Number.isFinite(groupId)) {
			this.error = t.errors.invalidIds;
			this.loading = false;
			return;
		}

		const mine = ++this.#token;
		this.loading = true;
		this.error = null;

		try {
			const response = await this.#tournaments.getTournament(tournamentId);
			if (mine !== this.#token) return;

			if (response.status !== 200 || !response.data) {
				this.error = t.errors.tournamentFetchFailed;
				return;
			}

			this.tournament = response.data;
			// Seed the shared cache so a sibling page does not refetch this.
			tournamentCache.add(groupId, response.data);

			const found = findTournamentGroup(response.data, groupId);
			this.group = found?.group ?? null;
			this.roundsMap = new SvelteMap(
				(found?.group.tournamentRounds ?? []).map((round) => [round.roundNumber, round])
			);

			await this.#loadResults(groupId, response.data.type, true, mine);
		} catch {
			if (mine !== this.#token) return;
			this.error = t.errors.resultsLoadFailed;
			this.#clearResults();
		} finally {
			if (mine === this.#token) this.loading = false;
		}
	}

	/** Re-fetch results only, for live updates. Metadata does not change mid-event. */
	async refresh(): Promise<void> {
		const tournament = this.tournament;
		const groupId = this.group?.id;
		if (!tournament || groupId == null) return;
		await this.#loadResults(groupId, tournament.type, false, this.#token);
	}

	async #loadResults(
		groupId: number,
		tournamentType: number,
		isInitialLoad: boolean,
		token: number
	): Promise<void> {
		// Schackfyran: nothing to fetch, and asking would 404.
		if (isTeamTournament(tournamentType) && !isTeamPairing(tournamentType)) {
			this.#clearResults();
			this.lastUpdated = Date.now();
			return;
		}

		if (isTeamPairing(tournamentType)) {
			await this.#loadTeamResults(groupId, isInitialLoad, token);
		} else {
			await this.#loadIndividualResults(groupId, isInitialLoad, token);
		}
		if (token === this.#token) this.lastUpdated = Date.now();
	}

	async #loadTeamResults(groupId: number, isInitialLoad: boolean, token: number): Promise<void> {
		const [table, rounds] = await Promise.all([
			this.#results.getTeamTournamentResults(groupId),
			this.#results.getTeamRoundResults(groupId)
		]);
		if (token !== this.#token) return;

		this.teamResults = table.status === 200 ? (table.data ?? []) : [];
		const roundData = rounds.status === 200 ? (rounds.data ?? []) : [];
		// The API answers empty while it is mid-update. Keeping the previous rounds
		// stops a live table blanking out under the reader.
		if (roundData.length > 0 || isInitialLoad) this.teamRoundResults = roundData;
		this.individualResults = [];
		this.individualRoundResults = [];
	}

	async #loadIndividualResults(
		groupId: number,
		isInitialLoad: boolean,
		token: number
	): Promise<void> {
		const [table, rounds] = await Promise.all([
			this.#results.getTournamentResults(groupId),
			this.#results.getTournamentRoundResults(groupId)
		]);
		if (token !== this.#token) return;

		this.individualResults = table.status === 200 ? (table.data ?? []) : [];
		const roundData = rounds.status === 200 ? (rounds.data ?? []) : [];
		// Same reasoning as the team path above.
		if (roundData.length > 0 || isInitialLoad) this.individualRoundResults = roundData;
		this.teamResults = [];
		this.teamRoundResults = [];
	}

	#clearResults(): void {
		this.individualResults = [];
		this.individualRoundResults = [];
		this.teamResults = [];
		this.teamRoundResults = [];
	}

	// --- Player lookups ---

	/** Historical entry first, then this group's standings, then the current-month cache. */
	#findPlayer(playerId: number, date?: number): PlayerInfoDto | undefined {
		if (date !== undefined) {
			const historical = playerCache.getByDate(playerId, date);
			if (historical) return historical;
		}
		return this.playerMap.get(playerId) ?? playerCache.get(playerId);
	}

	getPlayerName(playerId: number, date?: number): string {
		const t = getTranslation(language.current).pages.tournamentResults;
		const kind = getOpponentKind(playerId);
		if (kind === 'walkover') return t.walkover;
		if (kind === 'bye') return t.bye;
		const player = this.#findPlayer(playerId, date);
		if (!player) return t.unknownPlayer;
		return formatPlayerName(player.firstName, player.lastName, player.elo?.title);
	}

	/** Strict: only the rating type the group ranks on, never a substitute. */
	getPlayerElo(playerId: number): string {
		const player = this.#findPlayer(playerId);
		const { rating, ratingType } = getPlayerRatingStrict(player?.elo, this.rankingAlgorithm);
		return formatRatingWithType(rating, ratingType, language.current);
	}

	getPlayerClubId(playerId: number): number | null {
		return this.#findPlayer(playerId)?.clubId ?? null;
	}

	getClubName(clubId: number): string {
		return this.#organizations.getClubName(clubId);
	}

	getPlayerByDate(playerId: number, date: number): PlayerInfoDto | undefined {
		return playerCache.getByDate(playerId, date);
	}

	getPlayerEloByDate(playerId: number, date: number): string {
		const player = playerCache.getByDate(playerId, date) ?? this.playerMap.get(playerId);
		const { rating, ratingType } = getPlayerRatingStrict(player?.elo, this.rankingAlgorithm);
		return formatRatingWithType(rating, ratingType, language.current);
	}

	getRoundRatedType(roundNumber: number): number | undefined {
		return this.roundsMap.get(roundNumber)?.rated;
	}

	/**
	 * Elo as of a round, using that round's own rating type where it has one.
	 *
	 * A tournament can mix rating types across rounds — a blitz chain inside a
	 * standard event, say — so a round's `rated` wins over the group algorithm.
	 * `rated === 0` means unrated, which falls back rather than showing nothing.
	 */
	getPlayerEloByDateAndRound(playerId: number, date: number, roundNumber?: number): string {
		const player = playerCache.getByDate(playerId, date) ?? this.playerMap.get(playerId);

		if (roundNumber !== undefined) {
			const roundRatedType = this.roundsMap.get(roundNumber)?.rated;
			if (roundRatedType !== undefined && roundRatedType !== 0) {
				const byRound = getPlayerRatingByRoundType(player?.elo, roundRatedType);
				return formatRatingWithType(byRound.rating, byRound.ratingType, language.current);
			}
		}

		const { rating, ratingType } = getPlayerRatingStrict(player?.elo, this.rankingAlgorithm);
		return formatRatingWithType(rating, ratingType, language.current);
	}

	/** Warm the cache for a round's players. Bye and walkover ids are dropped. */
	async fetchPlayersByDate(requests: PlayerDateRequest[]): Promise<void> {
		await playerCache.fetchManyByDate(requests);
	}
}

export const GROUP_RESULTS_KEY = Symbol('group-results');

export function setGroupResultsState(state = new GroupResultsState()): GroupResultsState {
	setContext(GROUP_RESULTS_KEY, state);
	return state;
}

export function getGroupResultsState(): GroupResultsState {
	return getContext<GroupResultsState>(GROUP_RESULTS_KEY);
}
