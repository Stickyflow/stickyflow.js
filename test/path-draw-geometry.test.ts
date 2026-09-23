import { describe, expect, it } from 'vitest';
import {
  isCloseToStart,
  MIN_POINTS_OPEN,
  MIN_POINTS_TO_CLOSE,
  snapTo45Degrees,
} from '../src/interaction/pathDraw/geometry';

describe('isCloseToStart', () => {
  it('never offers to close before the minimum point count', () => {
    expect(MIN_POINTS_TO_CLOSE).toBe(3);
    expect(MIN_POINTS_OPEN).toBe(2);
    const twoPoints = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(isCloseToStart(twoPoints, { x: 0.1, y: 0.1 }, 5)).toBe(false);
  });

  it('is true once the cursor lands within the snap radius of the start point', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(isCloseToStart(points, { x: 3, y: 4 }, 5)).toBe(true);
    expect(isCloseToStart(points, { x: 3, y: 4.01 }, 5)).toBe(false);
  });

  it('checks distance to the FIRST point only, not the nearest one', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    expect(isCloseToStart(points, { x: 99, y: 1 }, 5)).toBe(false);
  });
});

describe('snapTo45Degrees', () => {
  it('snaps a near-horizontal drag onto exactly horizontal, at the same distance', () => {
    const reference = { x: 0, y: 0 };
    const snapped = snapTo45Degrees(reference, { x: 100, y: 8 });
    expect(snapped.y).toBeCloseTo(0, 6);
    expect(Math.hypot(snapped.x - reference.x, snapped.y - reference.y)).toBeCloseTo(Math.hypot(100, 8), 6);
  });

  it('snaps a near-diagonal drag onto exactly 45 degrees', () => {
    const reference = { x: 10, y: 10 };
    const snapped = snapTo45Degrees(reference, { x: 60, y: 55 });
    expect(snapped.x - reference.x).toBeCloseTo(snapped.y - reference.y, 6);
  });

  it('leaves the reference point untouched at zero distance', () => {
    const reference = { x: 5, y: 5 };
    expect(snapTo45Degrees(reference, { x: 5, y: 5 })).toEqual({ x: 5, y: 5 });
  });

  it('is relative to the reference point, not the origin', () => {
    const snapped = snapTo45Degrees({ x: 200, y: 300 }, { x: 210, y: 391 });
    expect(snapped.x).toBeCloseTo(200, 6);
  });
});
