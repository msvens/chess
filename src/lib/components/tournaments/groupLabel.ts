/**
 * A group's name as a list of groups shows it, by the results page's rule
 * (a class picker when there are several classes, a group picker only when the
 * class has several groups):
 * - one class: the group (`Grupp A`), since the class would repeat the event;
 * - several classes, one group in this class: the class (`Div 2`), since its
 *   lone group is usually named like it and Lag-DM would read `Div 2, Div 2`;
 * - several classes, several groups in this class: both (`Elit, Grupp 1`).
 */
import { findTournamentGroup, type TournamentClassGroupDto, type TournamentDto } from '$lib/api';

export function groupLabel(tournament: TournamentDto, group: TournamentClassGroupDto): string {
	const found = findTournamentGroup(tournament, group.id);
	const className = found?.hasMultipleClasses ? found.parentClass.className : '';
	if (!className) return group.name;
	return (found?.parentClass.groups?.length ?? 0) > 1 ? `${className}, ${group.name}` : className;
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
