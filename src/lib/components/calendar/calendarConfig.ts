/**
 * How the calendar lays out its month and week views, per breakpoint.
 *
 * A choice for whoever builds the app, not a visitor setting:
 * - `grid`: the month as a grid of bars, the week as seven columns of cards.
 * - `agenda`: a compact picker (a month of day numbers, or a week strip) with
 *   dots for what is played, and the selected day's events in full below it,
 *   the way phone calendars do it.
 *
 * The day view and the List and Map tabs are the same in either layout.
 */
export type CalendarLayout = 'grid' | 'agenda';

export interface CalendarLayouts {
	/** Below the app's mobile breakpoint, `(max-width: 767px)`. */
	mobile: CalendarLayout;
	desktop: CalendarLayout;
}

export const CALENDAR_LAYOUT: CalendarLayouts = {
	mobile: 'agenda',
	desktop: 'grid'
};
