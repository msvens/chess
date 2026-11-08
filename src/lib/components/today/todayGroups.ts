import {
	findTournamentGroup,
	type TournamentClassDto,
	type TournamentClassGroupDto,
	type TournamentDto
} from '$lib/api';

export interface GroupToday {
	id: number;
	label: string;
}

function allGroups(classes: TournamentClassDto[] | undefined): TournamentClassGroupDto[] {
	return (classes ?? []).flatMap((c) => [...(c.groups ?? []), ...allGroups(c.subClasses)]);
}

const dayOf = (value: string | null | undefined) => value?.slice(0, 10) ?? '';

function coversDay(group: TournamentClassGroupDto, day: string): boolean {
	const start = dayOf(group.start);
	const end = dayOf(group.end);
	return Boolean(start && end) && start <= day && day <= end;
}

/**
 * The groups of a tournament that play on `day` (`YYYY-MM-DD`).
 *
 * Round dates decide when any group has one that day, so a league lists only
 * the divisions actually playing. Short events often have no round dates
 * filled in, so without any match the groups' own date ranges decide.
 */
export function groupsPlayingOn(tournament: TournamentDto, day: string): GroupToday[] {
	const groups = allGroups(tournament.rootClasses);
	const withRound = groups.filter((group) =>
		(group.tournamentRounds ?? []).some((round) => dayOf(round.roundDate) === day)
	);
	const playing = withRound.length > 0 ? withRound : groups.filter((g) => coversDay(g, day));

	return playing.map((group) => {
		const found = findTournamentGroup(tournament, group.id);
		const className = found?.hasMultipleClasses ? found.parentClass.className : '';
		return { id: group.id, label: className ? `${className}, ${group.name}` : group.name };
	});
}
