import { describe, expect, it } from 'vitest';
import {
  initialPieBoundary,
  type PieBoundaryDrag,
  pieBoundaryValueAt,
  resolvePieBoundary,
} from '../src/interaction/pieSliceDrag/boundary';

const START = -Math.PI / 2;
const TWO_PI = Math.PI * 2;

function expectBoundary(drag: PieBoundaryDrag | null): PieBoundaryDrag {
  expect(drag).not.toBeNull();
  return drag as PieBoundaryDrag;
}

const twoSlices = [
  { seriesId: 'a', start: START, end: START + TWO_PI * 0.6, value: 60 },
  { seriesId: 'b', start: START + TWO_PI * 0.6, end: START + TWO_PI, value: 40 },
];

const threeSlices = [
  { seriesId: 'online', start: START, end: START + TWO_PI * 0.58, value: 58 },
  { seriesId: 'retail', start: START + TWO_PI * 0.58, end: START + TWO_PI * 0.95, value: 37 },
  { seriesId: 'other', start: START + TWO_PI * 0.95, end: START + TWO_PI, value: 5 },
];

describe('resolvePieBoundary', () => {
  it('always takes the clicked slice and the one clockwise of it, whatever the pointer sits on', () => {
    const drag = expectBoundary(resolvePieBoundary(threeSlices, 1));
    expect(drag.before.seriesId).toBe('retail');
    expect(drag.after.seriesId).toBe('other');
    expect(drag.combinedValue).toBe(42);
  });

  it('gives the last slice its leading edge, since its trailing one is the fixed seam', () => {
    const drag = expectBoundary(resolvePieBoundary(threeSlices, 2));
    expect(drag.before.seriesId).toBe('retail');
    expect(drag.after.seriesId).toBe('other');
    expect(drag.combinedValue).toBe(42);
  });

  it('never hands out an arc that runs past the seam at twelve', () => {
    for (let clicked = 0; clicked < threeSlices.length; clicked++) {
      const drag = expectBoundary(resolvePieBoundary(threeSlices, clicked));
      expect(drag.arcStart).toBeGreaterThanOrEqual(START);
      expect(drag.arcEnd).toBeLessThanOrEqual(START + TWO_PI);
      expect(drag.arcEnd).toBeGreaterThan(drag.arcStart);
    }
  });

  it('lets both slices sharing the last movable edge reach it', () => {
    const fromRetail = expectBoundary(resolvePieBoundary(threeSlices, 1));
    const fromOther = expectBoundary(resolvePieBoundary(threeSlices, 2));
    expect(fromOther).toEqual(fromRetail);
  });

  it('spans exactly the two slices it joins, never more', () => {
    const drag = expectBoundary(resolvePieBoundary(threeSlices, 0));
    expect(drag.arcEnd - drag.arcStart).toBeCloseTo(TWO_PI * 0.95, 10);
  });

  it('covers the whole circle for a two slice pie, whose only edge is movable', () => {
    const drag = expectBoundary(resolvePieBoundary(twoSlices, 0));
    expect(drag.arcEnd - drag.arcStart).toBeCloseTo(TWO_PI, 10);
    expect(resolvePieBoundary(twoSlices, 1)).toEqual(drag);
  });

  it('refuses a single-slice chart : nothing to redistribute with', () => {
    expect(resolvePieBoundary([{ seriesId: 'a', start: START, end: START + TWO_PI, value: 100 }], 0)).toBeNull();
  });

  it('refuses an out-of-range clicked index', () => {
    expect(resolvePieBoundary(twoSlices, 5)).toBeNull();
  });

  it('refuses a pair with no arc between them at all', () => {
    const collapsed = [
      { seriesId: 'a', start: START, end: START, value: 0 },
      { seriesId: 'b', start: START, end: START, value: 0 },
    ];
    expect(resolvePieBoundary(collapsed, 0)).toBeNull();
  });
});

describe('pieBoundaryValueAt', () => {
  it('splits the combined value proportionally to where the boundary sits', () => {
    const drag = expectBoundary(resolvePieBoundary(twoSlices, 0));
    const midpoint = pieBoundaryValueAt(drag, (drag.arcStart + drag.arcEnd) / 2);
    expect(midpoint.beforeValue).toBeCloseTo(50, 10);
    expect(midpoint.afterValue).toBeCloseTo(50, 10);
  });

  it('conserves the combined total exactly, at any boundary position', () => {
    const drag = expectBoundary(resolvePieBoundary(twoSlices, 0));
    const atQuarter = pieBoundaryValueAt(drag, drag.arcStart + (drag.arcEnd - drag.arcStart) * 0.25);
    expect(atQuarter.beforeValue + atQuarter.afterValue).toBeCloseTo(100, 10);
  });

  it('reads a wrapped atan2 pointer inside the arc, instead of collapsing the slice', () => {
    const drag = expectBoundary(resolvePieBoundary(threeSlices, 0));
    const monotone = START + TWO_PI * 0.8;
    const raw = Math.atan2(Math.sin(monotone), Math.cos(monotone));
    expect(raw).toBeLessThan(0);
    expect(raw).toBeCloseTo(monotone - TWO_PI, 10);

    const split = pieBoundaryValueAt(drag, raw);
    expect(split.beforeValue).toBeCloseTo(80, 10);
    expect(split.afterValue).toBeCloseTo(15, 10);
  });

  it('never hands a slice more than the two of them had between them', () => {
    const drag = expectBoundary(resolvePieBoundary(threeSlices, 0));
    for (const angle of [0, 1, 2, 3, -1, -2, -3, 6, -6, 12]) {
      const split = pieBoundaryValueAt(drag, angle);
      expect(split.beforeValue).toBeGreaterThanOrEqual(0);
      expect(split.afterValue).toBeGreaterThanOrEqual(0);
      expect(split.beforeValue + split.afterValue).toBeCloseTo(95, 10);
      expect(split.boundary).toBeGreaterThanOrEqual(drag.arcStart);
      expect(split.boundary).toBeLessThanOrEqual(drag.arcEnd);
    }
  });

  it('starts out exactly where the clicked slice already ends', () => {
    const drag = expectBoundary(resolvePieBoundary(threeSlices, 0));
    expect(initialPieBoundary(drag)).toBeCloseTo(threeSlices[0].end, 10);

    const untouched = pieBoundaryValueAt(drag, initialPieBoundary(drag));
    expect(untouched.beforeValue).toBeCloseTo(58, 10);
    expect(untouched.afterValue).toBeCloseTo(37, 10);
  });

  it('lets a slice reach exactly zero without taking anything from the rest', () => {
    const drag = expectBoundary(resolvePieBoundary(threeSlices, 0));
    const nearlyCollapsed = drag.arcStart + 0.05;

    const collapsed = pieBoundaryValueAt(drag, drag.arcStart, nearlyCollapsed);
    expect(collapsed.beforeValue).toBe(0);
    expect(collapsed.afterValue).toBe(95);
    expect(collapsed.boundary).toBe(drag.arcStart);
  });

  it('holds a collapsed slice at zero instead of flipping it to full across the seam', () => {
    const drag = expectBoundary(resolvePieBoundary(threeSlices, 0));
    const pastTheSeam = drag.arcStart - 0.1;

    const held = pieBoundaryValueAt(drag, pastTheSeam, drag.arcStart);
    expect(held.beforeValue).toBe(0);
    expect(held.afterValue).toBe(95);
  });

  it('sticks at the edge the pointer left through, all the way across the outside gap', () => {
    const drag = expectBoundary(resolvePieBoundary(threeSlices, 0));
    const justPastEnd = pieBoundaryValueAt(drag, drag.arcEnd + 0.05, drag.arcEnd - 0.05);
    expect(justPastEnd.beforeValue).toBeCloseTo(95, 10);

    const farSideOfTheGap = pieBoundaryValueAt(drag, drag.arcStart - 0.05, justPastEnd.boundary);
    expect(farSideOfTheGap.beforeValue).toBeCloseTo(95, 10);
  });

  it('grows a collapsed slice back once the pointer comes back through the arc', () => {
    const drag = expectBoundary(resolvePieBoundary(threeSlices, 0));
    const reopened = pieBoundaryValueAt(drag, drag.arcStart + TWO_PI * 0.2, drag.arcStart);
    expect(reopened.beforeValue).toBeCloseTo(20, 10);
    expect(reopened.afterValue).toBeCloseTo(75, 10);
  });
});
