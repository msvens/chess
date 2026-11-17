import { describe, expect, it } from 'vitest';
import type { TournamentClassGroupDto, TournamentDto } from '$lib/api';
import { titleGroupLabel } from './groupLabel';

const group = (id: number, name: string) => ({ id, name }) as TournamentClassGroupDto;

const tournament = (
	name: string,
	classes: [className: string, groups: TournamentClassGroupDto[]][]
) =>
	({
		name,
		rootClasses: classes.map(([className, groups], i) => ({
			classID: i + 1,
			className,
			groups,
			subClasses: []
		}))
	}) as unknown as TournamentDto;

describe('titleGroupLabel', () => {
	it('names the group when the tournament has several', () => {
		const a = group(1, 'Grupp A');
		const t = tournament('Rilton Cup', [['Open', [a, group(2, 'Grupp B')]]]);
		expect(titleGroupLabel(t, a)).toBe('Grupp A');
	});

	it('names the class too when there are several classes', () => {
		const a = group(1, 'Grupp 1');
		const t = tournament('Rilton Cup', [
			['Elit', [a]],
			['Open', [group(2, 'Grupp 1')]]
		]);
		expect(titleGroupLabel(t, a)).toBe('Elit, Grupp 1');
	});

	it('adds nothing for a tournament with a single group', () => {
		const only = group(1, 'Grupp A');
		expect(titleGroupLabel(tournament('KM', [['KM', [only]]]), only)).toBeNull();
	});

	it('adds nothing for a group named like its tournament', () => {
		const same = group(1, 'Hästlampan hösten 2026');
		const t = tournament('Hästlampan Hösten 2026', [['A', [same, group(2, 'Reserv')]]]);
		expect(titleGroupLabel(t, same)).toBeNull();
	});
});
