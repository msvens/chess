/**
 * Display names for a FIDE player from mfide. Every mfide endpoint returns the
 * same player shape, with titles and federations already abbreviated.
 */
import type { MfidePlayer } from '$lib/api';

/** "GM Carlsen, Magnus": the playing title, else the women's title. */
export function formatFideTitledName(player: MfidePlayer): string {
	const title = player.title || player.womenTitle;
	return title ? `${title} ${player.name}` : player.name;
}

/** "GM Carlsen, Magnus (NOR)": the titled name and the federation. */
export function formatFidePlayerName(player: MfidePlayer): string {
	const name = formatFideTitledName(player);
	return player.country ? `${name} (${player.country})` : name;
}
