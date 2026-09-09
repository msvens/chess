/**
 * Display names for the three shapes ChessTools returns a FIDE player in. Each
 * endpoint spells titles and federations differently, so each gets its own
 * formatter; the abbreviation tables bring the profile endpoint's long forms
 * into line with the lists.
 */
import type { FideActivePlayer, FidePlayer, FidePlayerInfo } from '$lib/api';

export function formatFideActivePlayerName(player: FideActivePlayer): string {
	return player.country ? `${player.name} (${player.country})` : player.name;
}

export function formatFideSearchHitName(player: FidePlayer): string {
	const title = player.title || player.w_title || player.o_title || player.foa_title;
	return title ? `${title} ${player.name}` : player.name;
}

export function formatFidePlayerInfoName(player: FidePlayerInfo): string {
	const parts: string[] = [];
	if (player.fide_title && player.fide_title !== 'None') {
		parts.push(FIDE_TITLE_ABBREV[player.fide_title] ?? player.fide_title);
	}
	parts.push(player.name);
	if (player.federation) parts.push(`(${shortenFederation(player.federation)})`);
	return parts.join(' ');
}

/** The profile endpoint spells titles out; the list endpoints abbreviate them. */
const FIDE_TITLE_ABBREV: Record<string, string> = {
	Grandmaster: 'GM',
	'International Master': 'IM',
	'FIDE Master': 'FM',
	'Candidate Master': 'CM',
	'Woman Grandmaster': 'WGM',
	'Woman International Master': 'WIM',
	'Woman FIDE Master': 'WFM',
	'Woman Candidate Master': 'WCM'
};

/**
 * Likewise federations: the profile endpoint spells them out, the lists use the
 * three-letter code. Only the countries that turn up on the top list, plus the
 * Nordics; anything else is shown as sent.
 */
const FEDERATION_SHORT: Record<string, string> = {
	'United States of America': 'USA',
	'United States': 'USA',
	'Russian Federation': 'RUS',
	"People's Republic of China": 'CHN',
	China: 'CHN',
	'United Kingdom': 'GBR',
	England: 'ENG',
	'Czech Republic': 'CZE',
	'Republic of Korea': 'KOR',
	Korea: 'KOR',
	'Islamic Republic of Iran': 'IRI',
	Iran: 'IRI',
	Netherlands: 'NED',
	'The Netherlands': 'NED',
	Germany: 'GER',
	France: 'FRA',
	India: 'IND',
	Norway: 'NOR',
	Azerbaijan: 'AZE',
	Armenia: 'ARM',
	Uzbekistan: 'UZB',
	Poland: 'POL',
	Hungary: 'HUN',
	Spain: 'ESP',
	Ukraine: 'UKR',
	Romania: 'ROU',
	Sweden: 'SWE',
	Denmark: 'DEN',
	Finland: 'FIN',
	Iceland: 'ISL'
};

export function shortenFederation(federation: string): string {
	return FEDERATION_SHORT[federation] ?? federation;
}
