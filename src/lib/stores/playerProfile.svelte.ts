/**
 * Everything the player profile needs, for one player.
 *
 * Replaces `players/[memberId]/layout.tsx` and the 16-field `PlayerContext` it
 * provided. Not a layout here: the route has no siblings — the four tabs are
 * client state, not routes — so this is created by the page and re-created when
 * the page does. That alone removes the React version's staleness bug, where
 * `tournamentsLoading` was never re-armed and player B briefly showed player A's
 * tournaments as final.
 *
 * Holds state and actions only — no `$effect`, no timers — so it can be tested by
 * instantiating it. The route calls `load()` when the id changes.
 */
import { getContext, setContext } from 'svelte';
import {
	ResultsService,
	formatPlayerName,
	type GameDto,
	type PlayerInfoDto,
	type TournamentDto
} from '$lib/api';
import {
	buildParticipations,
	opponentIds,
	playedGroupIds,
	playerMapFor,
	tournamentMapFor,
	upcomingGroupIds
} from '$lib/player/participations';
import type { TournamentParticipation } from '$lib/player/participations';
import { playerCache } from './playerCache.svelte';
import { tournamentCache } from './tournamentCache.svelte';

export type { TournamentParticipation };

/** Shared so a profile with no id does not allocate a map per read. */
const EMPTY_PLAYERS = new Map<number, PlayerInfoDto>();

export class PlayerProfileState {
	memberId = $state<number | null>(null);
	/** The route param was not a number. Distinct from "no such player". */
	invalidId = $state(false);

	player = $state<PlayerInfoDto | null>(null);
	playerLoading = $state(true);

	games = $state<GameDto[]>([]);
	gamesLoading = $state(true);
	/**
	 * A flag, not a message. The React version stored one of two English strings
	 * here and every reader only ever tested it for truthiness — the strings could
	 * not reach the screen, and could not be translated if they had.
	 */
	gamesFailed = $state(false);

	/** Groups entered but not yet played; they carry no games to derive from. */
	upcomingGroupIds = $state<number[]>([]);
	tournamentsLoading = $state(true);

	/** The opponent whose head-to-head tab is open, if any. */
	selectedOpponentId = $state<number | null>(null);
	selectedOpponentName = $state<string | null>(null);

	#results = new ResultsService();

	/**
	 * Guards against a slower earlier load finishing after a later one — clicking
	 * from one opponent's profile to another is exactly how that happens.
	 */
	#token = 0;

	// --- Derived ---

	#participations = $derived.by(() =>
		this.memberId === null
			? []
			: buildParticipations(this.games, this.upcomingGroupIds, this.memberId, (groupId) =>
					tournamentCache.get(groupId)
				)
	);

	get tournaments(): TournamentParticipation[] {
		return this.#participations;
	}

	get individualTournaments(): TournamentParticipation[] {
		return this.#participations.filter((row) => !row.isTeam);
	}

	get teamTournaments(): TournamentParticipation[] {
		return this.#participations.filter((row) => row.isTeam);
	}

	/**
	 * The tournaments behind this player's games, as the SDK's helpers want them.
	 * Reactive, because `tournamentCache.get` is.
	 */
	#tournamentMap = $derived.by(() =>
		tournamentMapFor(this.games, this.upcomingGroupIds, (groupId) => tournamentCache.get(groupId))
	);

	get tournamentMap(): Map<number, TournamentDto> {
		return this.#tournamentMap;
	}

	/** The players named by these games, for the same reason as `tournamentMap`. */
	#playerMap = $derived.by(() =>
		this.memberId === null
			? EMPTY_PLAYERS
			: playerMapFor(this.games, this.memberId, (id) => playerCache.get(id))
	);

	get playerMap(): Map<number, PlayerInfoDto> {
		return this.#playerMap;
	}

	/** Includes the FIDE title, as every name in the app does. */
	get currentPlayerName(): string {
		if (!this.player) return '';
		return formatPlayerName(this.player.firstName, this.player.lastName, this.player.elo?.title);
	}

	/**
	 * Whether any opponent of these games is still unfetched.
	 *
	 * `missing` — the API confirmed there is no record — counts as resolved, so a
	 * player it cannot answer for reads "unknown" rather than "retrieving" forever.
	 */
	opponentsLoading(games: readonly GameDto[]): boolean {
		if (this.memberId === null) return false;
		return opponentIds(games, this.memberId).some((id) => playerCache.status(id) === 'unfetched');
	}

	// --- Actions ---

	setSelectedOpponent(opponentId: number | null, name?: string): void {
		this.selectedOpponentId = opponentId;
		this.selectedOpponentName = name ?? null;
	}

	/**
	 * The player, then their games, then the metadata those games point at.
	 *
	 * Staged so the header can render before the 230-game payload arrives — a busy
	 * player's games run to 80 KB, because the endpoint ships full PGN.
	 */
	async load(memberId: number): Promise<void> {
		const mine = ++this.#token;

		this.memberId = Number.isFinite(memberId) ? memberId : null;
		this.invalidId = !Number.isFinite(memberId);
		this.player = null;
		this.games = [];
		this.upcomingGroupIds = [];
		this.selectedOpponentId = null;
		this.selectedOpponentName = null;

		if (this.invalidId) {
			// Every flag cleared, or the page waits forever on a load that will
			// never come. The React version cleared only `gamesLoading` here, so a
			// non-numeric id showed "Loading player information..." permanently.
			this.playerLoading = false;
			this.gamesLoading = false;
			this.tournamentsLoading = false;
			return;
		}

		// Re-armed on every load, not just the first.
		this.playerLoading = true;
		this.gamesLoading = true;
		this.tournamentsLoading = true;
		this.gamesFailed = false;

		await playerCache.fetchByDate(memberId, Date.now());
		if (mine !== this.#token) return;
		this.player = playerCache.get(memberId) ?? null;
		this.playerLoading = false;

		const [games, entries] = await Promise.all([
			this.#results.getMemberGames(memberId),
			this.#results.getMemberTournamentResults(memberId)
		]);
		if (mine !== this.#token) return;

		// Soft-fail: schack.se can NPE aggregating team results. The tabs that need
		// games show an error, the rest of the page still works.
		if (games.status === 200 && games.data) {
			this.games = games.data;
		} else {
			this.gamesFailed = true;
		}
		this.gamesLoading = false;

		const played = playedGroupIds(this.games);
		this.upcomingGroupIds =
			entries.status === 200 && entries.data ? upcomingGroupIds(entries.data, played) : [];

		await tournamentCache.fetchMany([...played, ...this.upcomingGroupIds]);
		if (mine !== this.#token) return;
		this.tournamentsLoading = false;

		// Opponent names last: nothing above waits on them, and there can be well
		// over a hundred.
		const now = Date.now();
		await playerCache.fetchManyByDate(
			opponentIds(this.games, memberId).map((playerId) => ({ playerId, date: now }))
		);
	}
}

export const PLAYER_PROFILE_KEY = Symbol('player-profile');

export function setPlayerProfileState(state = new PlayerProfileState()): PlayerProfileState {
	setContext(PLAYER_PROFILE_KEY, state);
	return state;
}

export function getPlayerProfileState(): PlayerProfileState {
	return getContext<PlayerProfileState>(PLAYER_PROFILE_KEY);
}
