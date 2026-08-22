/**
 * Axis tick values, reproducing recharts' `getNiceTickValues`.
 *
 * The rating chart was drawn by recharts before the port. Its tick placement is
 * not the textbook 1/2/5 ladder — it rounds the *ratio* between the rough step
 * and its own order of magnitude up to a multiple of 0.05 (0.1 for a
 * single-digit step), then retries with a larger correction factor until the
 * ticks cover the data. That produces steps like 3 and 150 where a textbook
 * algorithm would give 2.5 and 100, so approximating it would visibly move
 * every gridline.
 *
 * Ported rather than approximated, and pinned against values captured from
 * recharts itself — see the test. `decimal.js-light` is not needed with it:
 * recharts uses it to keep float error out of the arithmetic, and rounding each
 * step to a sane number of places does the same job for the magnitudes a rating
 * axis deals in.
 *
 * Ticks may sit outside the data range; that is the point of them being nice.
 */

/** Number of digits before the decimal point, as recharts counts them. */
function digitCount(value: number): number {
	if (value === 0) return 1;
	return Math.floor(Math.log10(Math.abs(value))) + 1;
}

/** Kill float noise like 0.30000000000000004 without pulling in a decimal library. */
function clean(value: number): number {
	return Number(value.toPrecision(12));
}

/**
 * A step that reads well: the rough step's ratio to its own order of magnitude,
 * rounded up to a multiple of 0.05 — or 0.1 when the step has a single digit.
 */
export function niceStep(roughStep: number, correctionFactor = 0): number {
	if (roughStep <= 0) return 0;

	const digits = digitCount(roughStep);
	const magnitude = Math.pow(10, digits);
	const ratio = roughStep / magnitude;
	const ratioScale = digits !== 1 ? 0.05 : 0.1;
	const amended = (Math.ceil(ratio / ratioScale) + correctionFactor) * ratioScale;

	return clean(amended * magnitude);
}

interface Step {
	step: number;
	tickMin: number;
	tickMax: number;
}

/**
 * Step and extent for a range, growing the step until `tickCount` ticks cover it.
 *
 * Zero is always a tick when the range straddles it; otherwise the ticks are
 * hung off the midpoint, snapped down to a whole number of steps.
 */
function calculateStep(min: number, max: number, tickCount: number, correctionFactor = 0): Step {
	if (!Number.isFinite((max - min) / (tickCount - 1))) {
		return { step: 0, tickMin: 0, tickMax: 0 };
	}

	const step = niceStep((max - min) / (tickCount - 1), correctionFactor);

	const middle = min <= 0 && max >= 0 ? 0 : clean((min + max) / 2 - (((min + max) / 2) % step));

	let belowCount = Math.ceil((middle - min) / step);
	let upCount = Math.ceil((max - middle) / step);
	const scaleCount = belowCount + upCount + 1;

	if (scaleCount > tickCount) {
		// Too many ticks needed to cover the range — widen the step and retry.
		return calculateStep(min, max, tickCount, correctionFactor + 1);
	}
	if (scaleCount < tickCount) {
		// Room to spare: pad the end the data grows towards.
		if (max > 0) upCount += tickCount - scaleCount;
		else belowCount += tickCount - scaleCount;
	}

	return {
		step,
		tickMin: clean(middle - belowCount * step),
		tickMax: clean(middle + upCount * step)
	};
}

/** Ticks for a range where every value is the same. */
function ticksOfSingleValue(value: number, tickCount: number): number[] {
	const step = 1;
	const middle = Number.isInteger(value) ? value : Math.floor(value);
	const middleIndex = Math.floor((tickCount - 1) / 2);

	return Array.from({ length: tickCount }, (_, i) => clean(middle + (i - middleIndex) * step));
}

/**
 * `tickCount` values spanning at least `[min, max]`, rounded to read well.
 *
 * Defaults to 5, which is recharts' default for a Y axis.
 */
export function niceTicks(min: number, max: number, tickCount = 5): number[] {
	const count = Math.max(tickCount, 2);
	const [lo, hi] = min > max ? [max, min] : [min, max];

	if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [];
	if (lo === hi) return ticksOfSingleValue(lo, tickCount);

	const { step, tickMin, tickMax } = calculateStep(lo, hi, count);
	if (step <= 0) return [];

	const ticks: number[] = [];
	// The tenth-of-a-step slack is recharts', and stops the last tick being lost
	// to float error.
	const end = tickMax + 0.1 * step;
	for (let value = tickMin, i = 0; value < end && i < 100_000; value = clean(value + step), i++) {
		ticks.push(value);
	}

	return min > max ? ticks.reverse() : ticks;
}
