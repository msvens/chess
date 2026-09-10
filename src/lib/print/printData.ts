/**
 * Data layer for the print route: a tournament and, for one group or all of
 * them, the standings and round pairings the sheets need.
 * Ports `components/print/printData.ts`.
 *
 * Pure and component-free, so it can be tested without rendering. It fetches
 * every target group in parallel, which is the one thing it does that the
 * results detail layout does not — that page only ever has one group.
 */
import {
	ResultsService,
	TournamentService,
	findTournamentGroup,
	isTeamPairing,
	isTeamTournament,
	type PlayerInfoDto,
	type TeamTournamentEndResultDto,
	type TournamentClassDto,
	type TournamentClassGroupDto,
	type TournamentDto,
	type TournamentEndResultDto,
	type TournamentRoundResultDto
} from '$lib/api';

/**
 * Which endpoints a tournament's results live behind.
 *
 * `individuallyPairedTeam` is Schackfyran: a team competition paired
 * individually, with no team-standings endpoint upstream. `GroupResultsState`
 * makes the same three-way distinction and the results page shows a notice for
 * this one rather than fetching.
 *
 * **This is why print must not simply fall through to the individual branch.**
 * The Next print route knew only the first two kinds, so a Schackfyran took the
 * individual path — and the API does answer there. The federation deliberately
 * withholds Schackfyran individual standings because the players are children
 * who are not tournament-registered (see `isSchackfyran` in the SDK), so
 * printing them works against that. The notice, and a link to the official
 * site, is the whole sheet.
 *
 * The predicate pair is the store's rather than `isSchackfyran` so the two
 * classifications provably agree; today they are the same set, since
 * `isTeamTournament` minus `isTeamPairing` is exactly Schackfyran.
 */
export type GroupKind = 'individual' | 'team' | 'individuallyPairedTeam';

export function groupKindOf(tournamentType: number | null | undefined): GroupKind {
	if (tournamentType == null) return 'individual';
	if (isTeamPairing(tournamentType)) return 'team';
	if (isTeamTournament(tournamentType)) return 'individuallyPairedTeam';
	return 'individual';
}

export interface PrintGroupData {
	group: TournamentClassGroupDto;
	className: string | null;
	/** The tournament has more than one class, so sheets name the class. */
	multipleClasses: boolean;
	/** This group's class has more than one group, so sheets name the group. */
	multipleGroups: boolean;
	kind: GroupKind;
	/** Individual standings; empty for the other two kinds. */
	standings: TournamentEndResultDto[];
	/** Team standings; empty for the other two kinds. */
	teamStandings: TeamTournamentEndResultDto[];
	/** Individual pairings, or the team match rows. */
	roundResults: TournamentRoundResultDto[];
	/** Players from the standings' embedded `playerInfo`, for the pairing sheet. */
	playerMap: Map<number, PlayerInfoDto>;
	/** Distinct round numbers present, ascending. */
	rounds: number[];
}

export interface PrintData {
	tournament: TournamentDto;
	groups: PrintGroupData[];
}

/** The class tree flattened, root classes and their subclasses, in order. */
function flattenClasses(tournament: TournamentDto): TournamentClassDto[] {
	const out: TournamentClassDto[] = [];
	const walk = (c: TournamentClassDto) => {
		out.push(c);
		c.subClasses?.forEach(walk);
	};
	tournament.rootClasses?.forEach(walk);
	return out;
}

/** The first group in document order, which `/print/[tournamentId]` redirects to. */
export function firstGroupId(tournament: TournamentDto): number | undefined {
	for (const c of flattenClasses(tournament)) {
		if (c.groups?.[0]) return c.groups[0].id;
	}
	return undefined;
}

export interface PrintGroupNav {
	/** Classes that hold groups, for the class dropdown. */
	classOptions: { id: number; label: string; firstGroupId: number }[];
	/** The class the current group belongs to. */
	currentClassId: number | null;
	/** The current class's groups, for the group dropdown. */
	groupOptions: { id: number; label: string }[];
}

/**
 * The toolbar's cascading class then group navigation, mirroring the results
 * page: choosing a class jumps to its first group.
 */
export function buildGroupNav(tournament: TournamentDto, groupId: number): PrintGroupNav {
	const classes = flattenClasses(tournament).filter((c) => (c.groups?.length ?? 0) > 0);
	const classOptions = classes.map((c) => ({
		id: c.classID,
		label: c.className || `Class ${c.classID}`,
		firstGroupId: c.groups![0].id
	}));
	const current = classes.find((c) => c.groups!.some((g) => g.id === groupId)) ?? null;
	const groupOptions = (current?.groups ?? []).map((g) => ({ id: g.id, label: g.name }));
	return { classOptions, currentClassId: current?.classID ?? null, groupOptions };
}

/** Rounds present in a set of rows. A row with no `roundNr` is round 1. */
function distinctRounds(rows: TournamentRoundResultDto[]): number[] {
	return [...new Set(rows.map((r) => r.roundNr || 1))].sort((a, b) => a - b);
}

interface Target {
	group: TournamentClassGroupDto;
	className: string | null;
	multipleGroups: boolean;
}

/** The groups to print: one, or all of them in document order. */
function targetsFor(tournament: TournamentDto, groupId?: number): Target[] {
	if (groupId != null) {
		const found = findTournamentGroup(tournament, groupId);
		if (!found) return [];
		return [
			{
				group: found.group,
				className: found.parentClass?.className ?? null,
				multipleGroups: (found.parentClass?.groups?.length ?? 0) > 1
			}
		];
	}

	return flattenClasses(tournament).flatMap((c) =>
		(c.groups ?? []).map((group) => ({
			group,
			className: c.className ?? null,
			multipleGroups: (c.groups?.length ?? 0) > 1
		}))
	);
}

/**
 * Fetch and shape everything the sheets need. Omit `groupId` for every group.
 *
 * Throws only when the tournament itself cannot be loaded — a group whose
 * results fail degrades to empty rows, so one bad group does not lose the rest
 * of a print run.
 */
export async function loadPrintData(tournamentId: number, groupId?: number): Promise<PrintData> {
	const response = await new TournamentService().getTournament(tournamentId);
	if (response.status !== 200 || !response.data) throw new Error('Failed to load tournament');
	const tournament = response.data;

	const multipleClasses = flattenClasses(tournament).length > 1;
	const kind = groupKindOf(tournament.type);
	const results = new ResultsService();

	const groups = await Promise.all(
		targetsFor(tournament, groupId).map(
			async ({ group, className, multipleGroups }): Promise<PrintGroupData> => {
				const common = { group, className, multipleClasses, multipleGroups, kind };

				// Schackfyran: neither endpoint family answers for this shape, so do
				// not ask. The sheet shows the same notice the results page does.
				if (kind === 'individuallyPairedTeam') {
					return {
						...common,
						standings: [],
						teamStandings: [],
						roundResults: [],
						playerMap: new Map(),
						rounds: []
					};
				}

				if (kind === 'team') {
					const [standings, rounds] = await Promise.all([
						results.getTeamTournamentResults(group.id),
						results.getTeamRoundResults(group.id)
					]);
					const roundResults = rounds.status === 200 ? (rounds.data ?? []) : [];
					return {
						...common,
						standings: [],
						teamStandings: standings.status === 200 ? (standings.data ?? []) : [],
						roundResults,
						playerMap: new Map(),
						rounds: distinctRounds(roundResults)
					};
				}

				const [standingsResponse, roundsResponse] = await Promise.all([
					results.getTournamentResults(group.id),
					results.getTournamentRoundResults(group.id)
				]);
				const standings = standingsResponse.status === 200 ? (standingsResponse.data ?? []) : [];
				const roundResults = roundsResponse.status === 200 ? (roundsResponse.data ?? []) : [];
				const playerMap = new Map<number, PlayerInfoDto>();
				for (const row of standings) {
					if (row.playerInfo) playerMap.set(row.playerInfo.id, row.playerInfo);
				}
				return {
					...common,
					standings,
					teamStandings: [],
					roundResults,
					playerMap,
					rounds: distinctRounds(roundResults)
				};
			}
		)
	);

	return { tournament, groups };
}
