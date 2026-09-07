import { describe, expect, it } from 'vitest';
import { type PieBoundaryDrag, pieBoundaryValueAt, resolvePieBoundary } from '../src/interaction/pieSliceDrag/boundary';

function expectBoundary(drag: PieBoundaryDrag | null): PieBoundaryDrag {
  expect(drag).not.toBeNull();
  return drag as PieBoundaryDrag;
}

const START = -Math.PI / 2;
const TWO_PI = Math.PI * 2;

const twoSlices = [
  { seriesId: 'a', start: START, end: START + TWO_PI * 0.6, value: 60 },
  { seriesId: 'b', start: START + TWO_PI * 0.6, end: START + TWO_PI, value: 40 },
];

const threeSlices = [
  { seriesId: 'a', start: START, end: START + TWO_PI * 0.5, value: 50 },
  { seriesId: 'b', start: START + TWO_PI * 0.5, end: START + TWO_PI * 0.8, value: 30 },
  { seriesId: 'c', start: START + TWO_PI * 0.8, end: START + TWO_PI, value: 20 },
];

describe('resolvePieBoundary', () => {
  it('picks the boundary nearer the pointer within the clicked slice', () => {
    const nearStart = resolvePieBoundary(threeSlices, 1, threeSlices[1].start + 0.01);
    expect(nearStart?.before.seriesId).toBe('a');
    expect(nearStart?.after.seriesId).toBe('b');

    const nearEnd = resolvePieBoundary(threeSlices, 1, threeSlices[1].end - 0.01);
    expect(nearEnd?.before.seriesId).toBe('b');
    expect(nearEnd?.after.seriesId).toBe('c');
  });

  it('combines exactly the two adjacent values, not the whole chart', () => {
    const drag = resolvePieBoundary(threeSlices, 1, threeSlices[1].start + 0.01);
    expect(drag?.combinedValue).toBe(80);
  });

  it('wraps correctly between the last slice and the first', () => {
    const dragFromLast = resolvePieBoundary(threeSlices, 2, threeSlices[2].end - 0.01);
    expect(dragFromLast?.before.seriesId).toBe('c');
    expect(dragFromLast?.after.seriesId).toBe('a');
    expect(dragFromLast?.combinedValue).toBe(70);

    const dragFromFirst = resolvePieBoundary(threeSlices, 0, threeSlices[0].start + 0.01);
    expect(dragFromFirst?.before.seriesId).toBe('c');
    expect(dragFromFirst?.after.seriesId).toBe('a');
    expect(dragFromFirst?.combinedValue).toBe(70);
  });

  it('resolves the same wraparound boundary from either side, in its own consistent (if shifted) frame', () => {
    const fromLast = expectBoundary(resolvePieBoundary(threeSlices, 2, threeSlices[2].end - 0.01));
    const fromFirst = expectBoundary(resolvePieBoundary(threeSlices, 0, threeSlices[0].start + 0.01));
    expect(fromLast.arcEnd - fromLast.arcStart).toBeCloseTo(fromFirst.arcEnd - fromFirst.arcStart, 10);
    expect((fromLast.arcEnd - fromFirst.arcEnd) % TWO_PI).toBeCloseTo(0, 10);
    expect((fromLast.arcStart - fromFirst.arcStart) % TWO_PI).toBeCloseTo(0, 10);
  });

  it('refuses a single-slice chart : nothing to redistribute with', () => {
    expect(resolvePieBoundary([{ seriesId: 'a', start: START, end: START + TWO_PI, value: 100 }], 0, START)).toBeNull();
  });

  it('refuses an out-of-range clicked index', () => {
    expect(resolvePieBoundary(twoSlices, 5, START)).toBeNull();
  });
});

describe('pieBoundaryValueAt', () => {
  it('splits the combined value proportionally to where the boundary sits', () => {
    const drag = expectBoundary(resolvePieBoundary(twoSlices, 0, twoSlices[0].end - 0.01));
    const midpoint = pieBoundaryValueAt(drag, (drag.arcStart + drag.arcEnd) / 2);
    expect(midpoint.beforeValue).toBeCloseTo(50, 5);
    expect(midpoint.afterValue).toBeCloseTo(50, 5);
  });

  it('conserves the combined total exactly, at any boundary position', () => {
    const drag = expectBoundary(resolvePieBoundary(twoSlices, 0, twoSlices[0].end - 0.01));
    const atQuarter = pieBoundaryValueAt(drag, drag.arcStart + (drag.arcEnd - drag.arcStart) * 0.25);
    expect(atQuarter.beforeValue + atQuarter.afterValue).toBeCloseTo(100, 10);
  });

  it('never lets a slice hit exactly zero — the far side keeps a sliver instead', () => {
    const drag = expectBoundary(resolvePieBoundary(twoSlices, 0, twoSlices[0].end - 0.01));
    const atStart = pieBoundaryValueAt(drag, drag.arcStart - 10);
    expect(atStart.beforeValue).toBeGreaterThan(0);
    expect(atStart.afterValue).toBeLessThan(100);

    const atEnd = pieBoundaryValueAt(drag, drag.arcEnd + 10);
    expect(atEnd.afterValue).toBeGreaterThan(0);
  });
});
