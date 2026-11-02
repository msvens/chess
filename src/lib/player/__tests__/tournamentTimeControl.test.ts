import { describe, expect, it } from 'vitest';
import {
	PointSystem,
	RatingAlgorithm,
	RoundRatedType,
	type TournamentClassGroupDto,
	type TournamentDto
} from '$lib/api';
import type { TournamentParticipation } from '../participations';
import {
	countByTimeControl,
	filterByTimeControl,
	tournamentTimeControl
} from '../tournamentTimeControl';

const { UNRATED, STANDARD, RAPID, BLITZ } = RoundRatedType;

const group = (
	id: number,
	rated: number[],
	rankingAlgorithm: number = RatingAlgorithm.STANDARD_ELO,
	pointSystem: number = PointSystem.DEFAULT
): TournamentClassGroupDto =>
	({
		id,
		name: 'A',
		rankingAlgorithm,
		pointSystem,
		tournamentRounds: rated.map((r, i) => ({ roundNumber: i + 1, rated: r }))
	}) as unknown as TournamentClassGroupDto;

/** One participation row, its tournament holding the given group. */
const row = (g: TournamentClassGroupDto, groupId = g.id): TournamentParticipation =>
	({
		groupId,
		tournament: {
			id: g.id * 10,
			rootClasses: [{ classID: 1, className: '', groups: [g] }]
		} as unknown as TournamentDto
	}) as TournamentParticipation;

describe('tournamentTimeControl', () => {
	it('is the one type every rated round is played at', () => {
		expect(tournamentTimeControl(group(1, [STANDARD, STANDARD]))).toBe('standard');
		expect(tournamentTimeControl(group(1, [RAPID, RAPID]))).toBe('rapid');
		expect(tournamentTimeControl(group(1, [BLITZ, BLITZ]))).toBe('blitz');
	});

	it('is mixed when the rounds are rated at more than one type', () => {
		// Rapid opening rounds in a standard event.
		expect(tournamentTimeControl(group(1, [RAPID, RAPID, STANDARD, STANDARD]))).toBe('mixed');
	});

	it('ignores unrated rounds in a rated group', () => {
		expect(tournamentTimeControl(group(1, [UNRATED, BLITZ, BLITZ]))).toBe('blitz');
	});

	it('is unrated when every round is', () => {
		expect(tournamentTimeControl(group(1, [UNRATED, UNRATED], RatingAlgorithm.RAPID_ELO))).toBe(
			'unrated'
		);
	});

	it('is unrated for Schackfyran scoring, whatever the rounds say', () => {
		expect(
			tournamentTimeControl(
				group(1, [STANDARD], RatingAlgorithm.STANDARD_ELO, PointSystem.SCHACK4AN)
			)
		).toBe('unrated');
	});

	it('falls back on the ranking algorithm without round data', () => {
		expect(tournamentTimeControl(group(1, [], RatingAlgorithm.BLITZ_ELO))).toBe('blitz');
	});
});

describe('counting and filtering a player’s tournaments', () => {
	const standard = row(group(1, [STANDARD]));
	const mixed = row(group(2, [RAPID, STANDARD]));
	const unrated = row(group(3, [UNRATED]));
	// The tournament no longer lists the group the games point at.
	const orphan = row(group(4, [STANDARD]), 99);
	const rows = [standard, mixed, unrated, orphan];

	it('counts each kind, and every row under all', () => {
		expect(countByTimeControl(rows)).toEqual({
			all: 4,
			standard: 1,
			rapid: 0,
			blitz: 0,
			mixed: 1,
			unrated: 1
		});
	});

	it('keeps only the chosen kind', () => {
		expect(filterByTimeControl(rows, 'mixed')).toEqual([mixed]);
		expect(filterByTimeControl(rows, 'standard')).toEqual([standard]);
	});

	it('keeps everything under all, a row it cannot classify included', () => {
		expect(filterByTimeControl(rows, 'all')).toEqual(rows);
	});
});
