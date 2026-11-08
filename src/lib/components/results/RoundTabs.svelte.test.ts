import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RoundTabs from './RoundTabs.svelte';

const ROUNDS = [1, 2, 3, 4, 5, 6, 7];
const STRIP_WIDTH = 320;
const TAB_WIDTH = 80;

const box = (left: number, width: number) => ({ left, width }) as DOMRect;

/** jsdom has no layout: tabs are laid out side by side from the strip's left edge. */
beforeEach(() => {
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
		if (this.tagName !== 'BUTTON') return box(0, STRIP_WIDTH);
		const round = Number(this.textContent?.match(/\d+/)?.[0]);
		return box((round - 1) * TAB_WIDTH - (this.parentElement?.scrollLeft ?? 0), TAB_WIDTH);
	});
});

afterEach(() => vi.restoreAllMocks());

function setup(activeRound: number | null, onSelect = vi.fn()) {
	const props = { rounds: ROUNDS, activeRound, dateOf: () => '', onSelect };
	const result = render(RoundTabs, { props });
	const strip = () => screen.getAllByRole('button')[0].parentElement as HTMLElement;
	return { ...result, strip };
}

/** Where the strip must sit for a round's tab to be in the middle of it. */
const centred = (round: number) => (round - 1) * TAB_WIDTH - (STRIP_WIDTH - TAB_WIDTH) / 2;

describe('the round tabs', () => {
	it('centres the active round when it first appears, without animating', () => {
		const { strip } = setup(7);
		expect(strip().scrollLeft).toBe(centred(7));
		expect(strip().style.scrollBehavior).toBe('auto');
	});

	it('moves to a newly chosen round, animated', async () => {
		const { strip, rerender } = setup(7);
		await rerender({ activeRound: 4 });
		expect(strip().scrollLeft).toBe(centred(4));
		expect(strip().style.scrollBehavior).toBe('smooth');
	});

	it('leaves the strip alone when the rounds refresh but the active one stays', async () => {
		const { strip, rerender } = setup(7);
		strip().scrollLeft = 12;
		await rerender({ rounds: [...ROUNDS] });
		expect(strip().scrollLeft).toBe(12);
	});

	it('marks only the active round', () => {
		setup(3);
		expect(screen.getByRole('button', { current: true })).toHaveTextContent('Rond 3');
	});

	it('reports the round that was chosen', async () => {
		const onSelect = vi.fn();
		setup(1, onSelect);
		await userEvent.setup().click(screen.getByRole('button', { name: /Rond 5/ }));
		expect(onSelect).toHaveBeenCalledWith(5);
	});

	it('shows a date only where there is one', () => {
		const props = {
			rounds: [1, 2],
			activeRound: 1,
			dateOf: (round: number) => (round === 1 ? '26-11-08' : ''),
			onSelect: vi.fn()
		};
		render(RoundTabs, { props });
		expect(screen.getByText('26-11-08')).toBeInTheDocument();
		expect(screen.getAllByRole('button')[1].children).toHaveLength(1);
	});
});
