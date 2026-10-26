import { describe, expect, it } from 'vitest';
import type { MfidePlayer } from '$lib/api';
import { formatFidePlayerName, formatFideTitledName } from './fideNames';

const player = (over: Partial<MfidePlayer>) =>
	({
		name: 'Carlsen, Magnus',
		country: 'NOR',
		title: 'GM',
		womenTitle: '',
		otherTitles: [],
		foaTitle: '',
		...over
	}) as MfidePlayer;

describe('formatFidePlayerName', () => {
	it('puts the title first and the federation last', () => {
		expect(formatFidePlayerName(player({}))).toBe('GM Carlsen, Magnus (NOR)');
	});

	it('falls back to the women’s title', () => {
		expect(
			formatFidePlayerName(
				player({ name: 'Hou, Yifan', country: 'CHN', title: '', womenTitle: 'WGM' })
			)
		).toBe('WGM Hou, Yifan (CHN)');
	});

	it('leaves arbiter and other titles out', () => {
		expect(formatFidePlayerName(player({ title: '', otherTitles: ['IA'], foaTitle: 'AGM' }))).toBe(
			'Carlsen, Magnus (NOR)'
		);
	});

	it('omits an empty federation', () => {
		expect(formatFidePlayerName(player({ country: '' }))).toBe('GM Carlsen, Magnus');
	});
});

describe('formatFideTitledName', () => {
	it('is the titled name without the federation', () => {
		expect(formatFideTitledName(player({}))).toBe('GM Carlsen, Magnus');
		expect(formatFideTitledName(player({ title: '' }))).toBe('Carlsen, Magnus');
	});
});
