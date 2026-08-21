import { describe, expect, it } from 'vitest';

/**
 * The date tests assert that formatting uses LOCAL time rather than UTC. In UTC
 * those are the same thing, so those assertions quietly pass for the wrong reason
 * — which is exactly what happened when CI first ran them.
 *
 * The test scripts pin TZ=Europe/Stockholm. This guards the pin itself, so the
 * failure mode is one obvious red test rather than several subtly toothless ones.
 */
describe('test timezone', () => {
	it('runs in Europe/Stockholm, not UTC', () => {
		expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Europe/Stockholm');
	});

	it('has a non-zero offset, so local and UTC are distinguishable', () => {
		// Sweden is UTC+1 or UTC+2 depending on DST; either way not zero.
		expect(new Date(2026, 6, 1).getTimezoneOffset()).not.toBe(0);
		expect(new Date(2026, 0, 1).getTimezoneOffset()).not.toBe(0);
	});
});
