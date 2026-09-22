import { describe, expect, it } from 'vitest';
import { isCloseToStart, MIN_POINTS_OPEN, MIN_POINTS_TO_CLOSE } from '../src/interaction/pathDraw/geometry';

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
