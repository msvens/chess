/**
 * Event colours by tournament type.
 * Ports `components/calendar/calendarColors.ts`.
 *
 * Every value is a whole literal class string so Tailwind's scanner can see it.
 * Never compose these — `bg-${colour}-100` produces a class that exists in the
 * markup and not in the stylesheet.
 *
 * The keys are `TournamentType`: 2 Allsvenskan · 3 Individual · 4 SM-Trean ·
 * 5 Skol-SM · 6 Svenska Cupen · 7 Grand Prix · 8 Yes2Chess · 9 Schackfyran.
 */

/** Bar background, text and border, light and dark. */
const BAR: Record<number, string> = {
	2: 'bg-blue-100 text-blue-800 border-blue-400 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-500/60',
	3: 'bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-500/60',
	4: 'bg-violet-100 text-violet-800 border-violet-400 dark:bg-violet-900/40 dark:text-violet-200 dark:border-violet-500/60',
	5: 'bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-500/60',
	6: 'bg-rose-100 text-rose-800 border-rose-400 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-500/60',
	7: 'bg-cyan-100 text-cyan-800 border-cyan-400 dark:bg-cyan-900/40 dark:text-cyan-200 dark:border-cyan-500/60',
	8: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-400 dark:bg-fuchsia-900/40 dark:text-fuchsia-200 dark:border-fuchsia-500/60',
	9: 'bg-teal-100 text-teal-800 border-teal-400 dark:bg-teal-900/40 dark:text-teal-200 dark:border-teal-500/60'
};

const DEFAULT_BAR =
	'bg-gray-100 text-gray-800 border-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-500/60';

/** The solid dot used by the colour key, the day popover and the map markers. */
const SWATCH: Record<number, string> = {
	2: 'bg-blue-500',
	3: 'bg-emerald-500',
	4: 'bg-violet-500',
	5: 'bg-amber-500',
	6: 'bg-rose-500',
	7: 'bg-cyan-500',
	8: 'bg-fuchsia-500',
	9: 'bg-teal-500'
};

const DEFAULT_SWATCH = 'bg-gray-400';

export function barClasses(type: number): string {
	return BAR[type] ?? DEFAULT_BAR;
}

export function swatchClasses(type: number): string {
	return SWATCH[type] ?? DEFAULT_SWATCH;
}
