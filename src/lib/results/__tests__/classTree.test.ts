import { describe, it, expect } from 'vitest';
import type { TournamentClassDto, TournamentDto } from '$lib/api';
import { findClassForGroup, findGroup, firstGroupOf, flattenClasses } from '../classTree';

const group = (id: number) => ({ id, name: `G${id}` }) as never;

const cls = (
	classID: number,
	groups: number[] = [],
	subClasses: TournamentClassDto[] = []
): TournamentClassDto =>
	({
		classID,
		className: `C${classID}`,
		groups: groups.map(group),
		subClasses
	}) as unknown as TournamentClassDto;

const tournament = (rootClasses: TournamentClassDto[]) =>
	({ rootClasses }) as unknown as TournamentDto;

describe('flattenClasses', () => {
	it('has nothing to walk without a tournament', () => {
		expect(flattenClasses(null)).toEqual([]);
		expect(flattenClasses(undefined)).toEqual([]);
		expect(flattenClasses({} as TournamentDto)).toEqual([]);
	});

	it('keeps every root class', () => {
		const flat = flattenClasses(tournament([cls(1), cls(2)]));
		expect(flat.map((c) => c.classID)).toEqual([1, 2]);
	});

	it('descends through nested subclasses to any depth', () => {
		const deep = cls(1, [], [cls(2, [], [cls(3, [], [cls(4)])])]);
		expect(flattenClasses(tournament([deep])).map((c) => c.classID)).toEqual([1, 2, 3, 4]);
	});

	it('lists a class immediately before its own children', () => {
		// The class selector renders this order as-is, so a subclass appearing
		// under its parent rather than after a sibling subtree is what makes the
		// list readable.
		const tree = tournament([cls(1, [], [cls(11), cls(12)]), cls(2, [], [cls(21)])]);
		expect(flattenClasses(tree).map((c) => c.classID)).toEqual([1, 11, 12, 2, 21]);
	});
});

describe('findClassForGroup', () => {
	const classes = flattenClasses(tournament([cls(1, [100, 101], [cls(2, [200])])]));

	it('finds the owning class at any depth', () => {
		expect(findClassForGroup(classes, 101)?.classID).toBe(1);
		expect(findClassForGroup(classes, 200)?.classID).toBe(2);
	});

	it('answers null for a group no class claims', () => {
		expect(findClassForGroup(classes, 999)).toBeNull();
	});

	it('answers null without a group id', () => {
		expect(findClassForGroup(classes, null)).toBeNull();
	});
});

describe('findGroup', () => {
	it('returns the group within its class', () => {
		expect(findGroup(cls(1, [100, 101]), 101)?.id).toBe(101);
	});

	it('returns null for a group in some other class', () => {
		expect(findGroup(cls(1, [100]), 200)).toBeNull();
	});

	it('returns null without a class', () => {
		expect(findGroup(null, 100)).toBeNull();
	});
});

describe('firstGroupOf', () => {
	it('is where selecting a class navigates', () => {
		expect(firstGroupOf(cls(1, [100, 101]))).toBe(100);
	});

	it('is null for a class that only groups other classes', () => {
		expect(firstGroupOf(cls(1, [], [cls(2, [200])]))).toBeNull();
		expect(firstGroupOf(null)).toBeNull();
	});
});
