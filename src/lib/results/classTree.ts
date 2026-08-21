/**
 * Walking a tournament's class hierarchy.
 *
 * A tournament holds `rootClasses`, each of which can nest `subClasses` to any
 * depth, and the groups a visitor can pick between hang off those classes. The
 * results page needs the tree flattened (for the class selector) and the class
 * that owns a given group (to know which selector entry is active).
 *
 * A plain module rather than part of the results store: this is a pure function
 * of the tournament DTO, and keeping it here means it can be tested against odd
 * shapes — deep nesting, empty classes, an unknown group id — without a store.
 */
import type { TournamentClassDto, TournamentClassGroupDto, TournamentDto } from '$lib/api';

/**
 * Every class in the tree, parents before their children (pre-order).
 *
 * Order is not incidental: the class selector lists these as-is, so a subclass
 * appearing directly under its parent is what makes the list readable.
 */
export function flattenClasses(tournament: TournamentDto | null | undefined): TournamentClassDto[] {
	const classes: TournamentClassDto[] = [];

	const visit = (cls: TournamentClassDto) => {
		classes.push(cls);
		for (const sub of cls.subClasses ?? []) visit(sub);
	};

	for (const root of tournament?.rootClasses ?? []) visit(root);
	return classes;
}

/** The class holding `groupId`, or null when no class claims it. */
export function findClassForGroup(
	classes: readonly TournamentClassDto[],
	groupId: number | null
): TournamentClassDto | null {
	if (groupId == null) return null;
	return classes.find((cls) => cls.groups?.some((group) => group.id === groupId)) ?? null;
}

/** The group itself within its class. */
export function findGroup(
	cls: TournamentClassDto | null,
	groupId: number | null
): TournamentClassGroupDto | null {
	if (!cls || groupId == null) return null;
	return cls.groups?.find((group) => group.id === groupId) ?? null;
}

/**
 * The first group of a class, which is where selecting a class navigates.
 * Null for a class that only groups other classes.
 */
export function firstGroupOf(cls: TournamentClassDto | null | undefined): number | null {
	return cls?.groups?.[0]?.id ?? null;
}
