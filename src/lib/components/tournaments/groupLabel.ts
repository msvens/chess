/**
 * A group's name as a list of groups shows it: with its class when the event
 * has several (`Elit, Grupp 1`), alone when it has one — a one-class event
 * repeats itself if the class name is shown too.
 */
import { findTournamentGroup, type TournamentClassGroupDto, type TournamentDto } from '$lib/api';

export function groupLabel(tournament: TournamentDto, group: TournamentClassGroupDto): string {
	const found = findTournamentGroup(tournament, group.id);
	const className = found?.hasMultipleClasses ? found.parentClass.className : '';
	return className ? `${className}, ${group.name}` : group.name;
}

function countGroups(classes: TournamentDto['rootClasses'] | null | undefined): number {
	return (classes ?? []).reduce(
		(sum, c) => sum + (c.groups?.length ?? 0) + countGroups(c.subClasses),
		0
	);
}

/**
 * The group's label for a page title, or null when it would only repeat the
 * tournament: a tournament with a single group, or a group named like it
 * ("Hästlampan hösten 2026" in "Hästlampan Hösten 2026").
 */
export function titleGroupLabel(
	tournament: TournamentDto,
	group: TournamentClassGroupDto
): string | null {
	const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
	if (countGroups(tournament.rootClasses) <= 1 || same(group.name, tournament.name)) return null;
	return groupLabel(tournament, group);
}
