import { describe, expect, it } from 'vitest';
import type { FideActivePlayer, FidePlayer, FidePlayerInfo } from '$lib/api';
import {
	formatFideActivePlayerName,
	formatFidePlayerInfoName,
	formatFideSearchHitName,
	shortenFederation
} from './fideNames';

describe('formatFidePlayerInfoName', () => {
	const info = (over: Partial<FidePlayerInfo>) =>
		({
			name: 'Carlsen, Magnus',
			federation: 'Norway',
			fide_title: 'Grandmaster',
			...over
		}) as FidePlayerInfo;

	it('abbreviates the title and federation the profile endpoint spells out', () => {
		expect(formatFidePlayerInfoName(info({}))).toBe('GM Carlsen, Magnus (NOR)');
	});

	it('drops the "None" title', () => {
		expect(formatFidePlayerInfoName(info({ fide_title: 'None' }))).toBe('Carlsen, Magnus (NOR)');
	});

	it('leaves an unknown title and federation as sent', () => {
		expect(formatFidePlayerInfoName(info({ fide_title: 'Honorary', federation: 'Atlantis' }))).toBe(
			'Honorary Carlsen, Magnus (Atlantis)'
		);
	});

	it('omits an empty federation', () => {
		expect(formatFidePlayerInfoName(info({ federation: '' }))).toBe('GM Carlsen, Magnus');
	});
});

describe('formatFideSearchHitName', () => {
	it('takes the first title the hit carries, in the list order', () => {
		const hit = { name: 'Hou, Yifan', title: '', w_title: 'WGM', o_title: 'IA' } as FidePlayer;
		expect(formatFideSearchHitName(hit)).toBe('WGM Hou, Yifan');
	});

	it('is just the name without any', () => {
		expect(formatFideSearchHitName({ name: 'Nobody' } as FidePlayer)).toBe('Nobody');
	});
});

describe('formatFideActivePlayerName', () => {
	it('appends the country code when there is one', () => {
		expect(formatFideActivePlayerName({ name: 'A', country: 'SWE' } as FideActivePlayer)).toBe(
			'A (SWE)'
		);
		expect(formatFideActivePlayerName({ name: 'A', country: '' } as FideActivePlayer)).toBe('A');
	});
});

describe('shortenFederation', () => {
	it('knows both spellings FIDE uses for the same country', () => {
		expect(shortenFederation('United States of America')).toBe('USA');
		expect(shortenFederation('United States')).toBe('USA');
	});
});
