/**
 * localStorage-backed tab preference for the organizations page.
 * Ports `components/organizations/organizationsPrefs.ts`.
 */
import { safeGetItem, safeSetItem } from '$lib/storage';

const TAB_KEY = 'organizations-active-tab';

export type OrganizationsTab = 'clubs' | 'map' | 'districts' | 'ssf';

export const ORGANIZATIONS_TABS: readonly OrganizationsTab[] = ['clubs', 'map', 'districts', 'ssf'];

export function isOrganizationsTab(v: string | null | undefined): v is OrganizationsTab {
	return !!v && (ORGANIZATIONS_TABS as readonly string[]).includes(v);
}

export function getSavedTab(): OrganizationsTab | null {
	const v = safeGetItem(TAB_KEY);
	return isOrganizationsTab(v) ? v : null;
}

export function setSavedTab(tab: OrganizationsTab): void {
	safeSetItem(TAB_KEY, tab);
}

/**
 * Which tab to open with: an explicit `?tab=` wins (deep links, and the redirects
 * from the old standalone /clubs and /districts routes), then the last-used tab,
 * then clubs.
 */
export function resolveInitialTab(tabParam: string | null): OrganizationsTab {
	if (isOrganizationsTab(tabParam)) return tabParam;
	return getSavedTab() ?? 'clubs';
}
