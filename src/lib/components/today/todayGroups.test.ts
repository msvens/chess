import { describe, expect, it } from 'vitest';
import type { TournamentClassDto, TournamentClassGroupDto, TournamentDto } from '$lib/api';
import { groupsPlayingOn } from './todayGroups';

const DAY = '2026-11-08';

const group = (
	id: number,
	name: string,
	roundDates: string[] = [],
	start = '2026-09-01',
	end = '2026-12-01'
) =>
	({
		id,
		name,
		start,
		end,
		tournamentRounds: roundDates.map((roundDate) => ({ roundDate }))
	}) as unknown as TournamentClassGroupDto;

const klass = (classID: number, className: string, groups: TournamentClassGroupDto[]) =>
	({ classID, className, groups }) as unknown as TournamentClassDto;

const tournament = (rootClasses: TournamentClassDto[]) =>
	({ id: 1, name: 'Allsvenskan', rootClasses }) as unknown as TournamentDto;

describe('the groups playing on a day', () => {
	it('keeps only the groups with a round that day', () => {
		const event = tournament([
			klass(1, 'Allsvenskan', [
				group(10, 'Div 1', ['2026-11-08 10:00:00']),
				group(11, 'Div 2', ['2026-11-09'])
			])
		]);
		expect(groupsPlayingOn(event, DAY)).toEqual([{ id: 10, label: 'Div 1' }]);
	});

	it('falls back to the group dates when no round is dated that day', () => {
		const event = tournament([
			klass(1, 'A', [
				group(10, 'Inside', [], '2026-11-08', '2026-11-08'),
				group(11, 'Outside', [], '2026-11-01', '2026-11-02')
			])
		]);
		expect(groupsPlayingOn(event, DAY)).toEqual([{ id: 10, label: 'Inside' }]);
	});

	it('finds nothing when neither rounds nor dates match', () => {
		const event = tournament([klass(1, 'A', [group(10, 'Out', [], '2026-01-01', '2026-01-02')])]);
		expect(groupsPlayingOn(event, DAY)).toEqual([]);
	});

	it('copes with a tournament that has no classes', () => {
		expect(groupsPlayingOn({ id: 1 } as TournamentDto, DAY)).toEqual([]);
	});

	it('names the class only when the event has more than one', () => {
		const roundToday = [`${DAY} 10:00:00`];
		const two = tournament([
			klass(1, 'Klass A', [group(10, 'Grupp 1', roundToday)]),
			klass(2, 'Klass B', [group(11, 'Grupp 1', roundToday)])
		]);
		expect(groupsPlayingOn(two, DAY).map((g) => g.label)).toEqual([
			'Klass A, Grupp 1',
			'Klass B, Grupp 1'
		]);

		const one = tournament([klass(1, 'Klass A', [group(10, 'Grupp 1', roundToday)])]);
		expect(groupsPlayingOn(one, DAY).map((g) => g.label)).toEqual(['Grupp 1']);
	});
});
