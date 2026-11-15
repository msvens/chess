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
