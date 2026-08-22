import { describe, it, expect } from 'vitest';
import { formatTeamId, parseTeamId } from '../teamId';

describe('parseTeamId', () => {
	it('reads an ordinary team id', () => {
		expect(parseTeamId('38481-5')).toEqual({ clubId: 38481, teamNumber: 5 });
	});

	it('reads the -1 team-number sentinel', () => {
		// A club with a single team, and every loose-team event, use -1. Splitting
		// on every dash instead of the first would lose this entirely.
		expect(parseTeamId('16322--1')).toEqual({ clubId: 16322, teamNumber: -1 });
	});

	it('rejects a segment with no dash', () => {
		expect(parseTeamId('38481')).toBeNull();
	});

	it('rejects a leading dash — a club id is never negative', () => {
		expect(parseTeamId('-100-1')).toBeNull();
		expect(parseTeamId('-1')).toBeNull();
	});

	it('rejects a missing half', () => {
		expect(parseTeamId('38481-')).toBeNull();
		expect(parseTeamId('-')).toBeNull();
	});

	it('rejects trailing junk rather than reading past it', () => {
		// `parseInt`, which the React version used, returns 5 for '5x' and 3 for
		// '3.7'. A wrong club id resolves to a different team instead of erroring.
		expect(parseTeamId('38481-5x')).toBeNull();
		expect(parseTeamId('3.7-5')).toBeNull();
		expect(parseTeamId('38481-5.0')).toBeNull();
	});

	it('rejects nothing at all', () => {
		expect(parseTeamId('')).toBeNull();
		expect(parseTeamId(undefined)).toBeNull();
	});
});

describe('formatTeamId', () => {
	it('joins the pair', () => {
		expect(formatTeamId(38481, 5)).toBe('38481-5');
	});

	it('produces the double dash for the sentinel', () => {
		expect(formatTeamId(16322, -1)).toBe('16322--1');
	});
});

describe('the pair round-trips', () => {
	it('survives format then parse', () => {
		for (const ref of [
			{ clubId: 38481, teamNumber: 5 },
			{ clubId: 16322, teamNumber: -1 },
			{ clubId: 1, teamNumber: 1 },
			{ clubId: 999999, teamNumber: 12 }
		]) {
			expect(parseTeamId(formatTeamId(ref.clubId, ref.teamNumber))).toEqual(ref);
		}
	});
});
