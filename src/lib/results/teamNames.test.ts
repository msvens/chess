import { describe, expect, it } from 'vitest';
import type { TeamTournamentEndResultDto } from '$lib/api';
import { teamNameOrId } from './teamNames';

/** A club event's row: `club` set, `team` null, team numbers from 1. */
const clubRow = (contenderId: number, name: string, teamNumber: number) =>
	({
		contenderId,
		teamNumber,
		club: { id: contenderId, name },
		team: null
	}) as unknown as TeamTournamentEndResultDto;

/** A school event's row: `team` set, `club` null, `teamNumber` -1. */
const schoolRow = (contenderId: number, name: string) =>
	({
		contenderId,
		teamNumber: -1,
		club: null,
		team: { id: contenderId, name }
	}) as unknown as TeamTournamentEndResultDto;

describe('teamNameOrId', () => {
	it('names a school team from the row, where there is no club at all', () => {
		const rows = [
			schoolRow(16196, 'Bilingual Montessori School of Lund'),
			schoolRow(16342, 'Söraskolan L1')
		];
		const name = teamNameOrId(rows);
		expect(name(16196, -1)).toBe('Bilingual Montessori School of Lund');
		expect(name(16342, -1)).toBe('Söraskolan L1');
	});

	it('keeps the Roman numeral when a club fields several teams', () => {
		const rows = [clubRow(38456, 'Kristallens SK', 1), clubRow(38456, 'Kristallens SK', 4)];
		const name = teamNameOrId(rows);
		expect(name(38456, 4)).toBe('Kristallens SK IV');
	});

	it('renders a lone first team bare', () => {
		const name = teamNameOrId([clubRow(38470, 'SS Delectus', 1)]);
		expect(name(38470, 1)).toBe('SS Delectus');
	});

	it('numbers a second team even when it is the only one in the group', () => {
		// The numeral is part of the team's identity across divisions, not just a
		// way to tell same-club teams apart.
		const name = teamNameOrId([clubRow(38462, 'Wasa SK', 2)]);
		expect(name(38462, 2)).toBe('Wasa SK II');
	});

	it('falls back to the bare id for a contender the standings do not carry', () => {
		const name = teamNameOrId([schoolRow(16196, 'Bilingual Montessori School of Lund')]);
		expect(name(99999, -1)).toBe('99999');
	});

	it('falls back for the bye sentinel too, which callers label before asking', () => {
		const name = teamNameOrId([clubRow(38470, 'SS Delectus', 1)]);
		expect(name(-100, 0)).toBe('-100');
	});

	it('survives empty standings', () => {
		expect(teamNameOrId([])(38470, 1)).toBe('38470');
	});
});
