import { describe, expect, it } from 'vitest';
import { byName, compareNames } from '$lib/utils/nameOrder';

describe('the one A–Z', () => {
	it('puts Å, Ä, Ö after Z, in that order', () => {
		const names = ['Örebro', 'Ärla', 'Zebra', 'Åby', 'Alingsås'];
		expect(names.sort(compareNames)).toEqual(['Alingsås', 'Zebra', 'Åby', 'Ärla', 'Örebro']);
	});

	it('ignores case', () => {
		expect(compareNames('lask open', 'LASK OPEN')).toBe(0);
		expect(['bromma', 'Alfa', 'Cepa'].sort(compareNames)).toEqual(['Alfa', 'bromma', 'Cepa']);
	});

	it('settles a tie by id, so the order never wobbles', () => {
		const a = { id: 2, name: 'KM' };
		const b = { id: 1, name: 'KM' };
		expect([a, b].sort(byName)).toEqual([b, a]);
	});
});
