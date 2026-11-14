/**
 * The official JGP standings for one division, with the names and dates of the
 * tournaments its columns stand for.
 *
 * Holds state and actions only — no `$effect` — so it can be tested by
 * instantiating it. The page owns the one effect that calls `load`.
 *
 * The standings come from Stockholms Schackförbund, which lists the tournaments
 * by id only; their names and dates come from SSF.
 */
import { TournamentService, type ApiResponse, type TournamentDto } from '$lib/api';
import {
	getJgpStandings,
	type JgpDivision,
	type JgpSeasonStandings,
	type JgpTable
} from '$lib/api/sthlm';

export interface JgpTournament {
	id: number;
	/** SSF's name; the bare id when SSF could not say. */
	name: string;
	/** Start date (`YYYY-MM-DD`); empty when unknown. */
	date: string;
}

export type StandingsFetcher = (division: JgpDivision) => Promise<ApiResponse<JgpSeasonStandings>>;
/** One tournament per id, in order; `null` where it could not be fetched. */
export type TournamentsFetcher = (ids: number[]) => Promise<(TournamentDto | null)[]>;

interface DivisionStandings {
	lastUpdated: string;
	tournaments: JgpTournament[];
	tables: JgpTable[];
}

const fetchTournaments: TournamentsFetcher = async (ids) =>
	(await new TournamentService().getTournamentBatch(ids)).map((result) => result.data);

export class JgpStandingsState {
	lastUpdated = $state<string | null>(null);
	tournaments = $state<JgpTournament[]>([]);
	tables = $state<JgpTable[] | null>(null);
	loading = $state(false);
	error = $state<string | null>(null);

	/** Not reactive on purpose: what renders is copied out into the fields above. */
	#cache: Partial<Record<JgpDivision, DivisionStandings>> = {};

	/** Which load is current, so a slow one cannot overwrite a newer one. */
	#generation = 0;

	constructor(
		private readonly standings: StandingsFetcher = getJgpStandings,
		private readonly tournamentsById: TournamentsFetcher = fetchTournaments
	) {}

	async load(division: JgpDivision): Promise<void> {
		const mine = ++this.#generation;

		const cached = this.#cache[division];
		if (cached) {
			this.#show(cached);
			this.loading = false;
			this.error = null;
			return;
		}

		this.loading = true;
		this.error = null;
		this.tables = null;
		this.tournaments = [];
		this.lastUpdated = null;

		const response = await this.standings(division);
		if (mine !== this.#generation) return;
		if (!response.data) {
			this.error = response.error ?? `HTTP ${response.status}`;
			this.loading = false;
			return;
		}

		// A missing name is not worth failing the standings over: the column
		// still links to the tournament by id.
		const { lastUpdated, tournamentIds, tables } = response.data;
		const found = await this.tournamentsById(tournamentIds);
		if (mine !== this.#generation) return;

		const result: DivisionStandings = {
			lastUpdated,
			tables,
			tournaments: tournamentIds.map((id, index) => ({
				id,
				name: found[index]?.name ?? String(id),
				date: found[index]?.start?.slice(0, 10) ?? ''
			}))
		};
		this.#cache[division] = result;
		this.#show(result);
		this.loading = false;
	}

	#show(standings: DivisionStandings): void {
		this.lastUpdated = standings.lastUpdated;
		this.tournaments = standings.tournaments;
		this.tables = standings.tables;
	}
}
