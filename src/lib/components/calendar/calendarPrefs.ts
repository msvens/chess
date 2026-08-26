/**
 * localStorage-backed preferences for the calendar page: the active tab, the
 * calendar's own week/month view, and the period last looked at.
 * Ports `components/calendar/calendarPrefs.ts`.
 *
 * The React version rolled its own `typeof window` and try/catch guards around
 * every read and write; `$lib/storage` already does that, so what is left is the
 * three keys and their validation.
 */
import { safeGetItem, safeSetItem } from '$lib/storage';
import { parseLocalDate } from '$lib/api';

const TAB_KEY = 'calendar-active-tab';
const VIEW_KEY = 'calendar-view-mode';
const ANCHOR_KEY = 'calendar-anchor';

export type CalendarTab = 'calendar' | 'list' | 'map';
export type CalendarViewMode = 'week' | 'month';

export const CALENDAR_TABS: readonly CalendarTab[] = ['calendar', 'list', 'map'];
export const CALENDAR_VIEWS: readonly CalendarViewMode[] = ['week', 'month'];

export function isCalendarTab(value: string | null | undefined): value is CalendarTab {
	return !!value && (CALENDAR_TABS as readonly string[]).includes(value);
}

export function isCalendarView(value: string | null | undefined): value is CalendarViewMode {
	return !!value && (CALENDAR_VIEWS as readonly string[]).includes(value);
}

/** The tab to open with: the last one used, else the calendar itself. */
export function initialTab(): CalendarTab {
	const saved = safeGetItem(TAB_KEY);
	return isCalendarTab(saved) ? saved : 'calendar';
}

export function saveTab(tab: CalendarTab): void {
	safeSetItem(TAB_KEY, tab);
}

export function initialView(): CalendarViewMode {
	const saved = safeGetItem(VIEW_KEY);
	return isCalendarView(saved) ? saved : 'month';
}

export function saveView(view: CalendarViewMode): void {
	safeSetItem(VIEW_KEY, view);
}

/**
 * The period last looked at, or today.
 *
 * Stored as a `YYYY-MM-DD` local date key rather than a timestamp, so it means
 * the same day whatever the clock has done since — and read back with
 * `parseLocalDate`, which is local midnight rather than UTC.
 */
export function initialAnchor(): Date {
	const saved = safeGetItem(ANCHOR_KEY);
	if (!saved || !/^\d{4}-\d{2}-\d{2}$/.test(saved)) return new Date();
	const date = parseLocalDate(saved);
	return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function saveAnchor(date: Date): void {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	safeSetItem(ANCHOR_KEY, `${year}-${month}-${day}`);
}
