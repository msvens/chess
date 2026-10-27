/**
 * localStorage-backed preferences for the calendar page: the active tab and the
 * calendar's own week/month view. Ports `components/calendar/calendarPrefs.ts`.
 *
 * Not the period last looked at, which the Next app also stored: the calendar
 * opening weeks later on whatever month you left it at was confusing, so it
 * always opens on today.
 *
 * The React version rolled its own `typeof window` and try/catch guards around
 * every read and write; `$lib/storage` already does that, so what is left is the
 * keys and their validation.
 */
import { safeGetItem, safeSetItem } from '$lib/storage';

const TAB_KEY = 'calendar-active-tab';
const VIEW_KEY = 'calendar-view-mode';

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
