import { describe, expect, it } from 'vitest';
import type { Rect } from '../src/model/geometry/types';
import {
  applyAxisSnap,
  computeSnap,
  MOVE_ACTIVE_POINTS,
  nearestCandidates,
  resizeActivePoints,
  type SnapConfig,
} from '../src/runtime/interaction/snapGeometry';

const bounds = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });

describe('computeSnap — move (all points active on both axes)', () => {
  const config = { threshold: 20, activeX: MOVE_ACTIVE_POINTS, activeY: MOVE_ACTIVE_POINTS, guideOverhang: 10 };

  it('snaps left-to-left when within threshold', () => {
    const result = computeSnap(bounds(105, 0, 50, 50), [bounds(100, 200, 50, 50)], config);
    expect(result.x.delta).toBe(-5);
    expect(result.x.guide).not.toBeNull();
    expect(result.x.guide?.orientation).toBe('vertical');
    expect(result.x.guide?.position).toBe(100);
  });

  it('snaps center-to-center', () => {
    const result = computeSnap(bounds(105, 0, 50, 50), [bounds(100, 200, 50, 50)], config);
    expect(Math.abs(result.x.delta)).toBeLessThanOrEqual(5);
  });

  it('snaps vertically independent of horizontal snapping', () => {
    const result = computeSnap(bounds(500, 108, 50, 50), [bounds(0, 100, 50, 50)], config);
    expect(result.y.delta).toBe(-8);
    expect(result.x.delta).toBe(0);
    expect(result.x.guide).toBeNull();
  });

  it('does not snap when nothing is within threshold', () => {
    const result = computeSnap(bounds(0, 0, 50, 50), [bounds(500, 500, 50, 50)], config);
    expect(result.x.delta).toBe(0);
    expect(result.x.guide).toBeNull();
    expect(result.y.delta).toBe(0);
    expect(result.y.guide).toBeNull();
  });

  it('threshold boundary: just under snaps, just at/over does not', () => {
    const isolated: SnapConfig = { threshold: 20, activeX: ['min'], activeY: [], guideOverhang: 10 };
    const justUnder = computeSnap(bounds(119, 0, 10, 10), [bounds(100, 0, 1000, 10)], isolated);
    expect(justUnder.x.delta).toBe(-19);
    const justOver = computeSnap(bounds(121, 0, 10, 10), [bounds(100, 0, 1000, 10)], isolated);
    expect(justOver.x.delta).toBe(0);
  });

  it('picks the single closest match across multiple candidates', () => {
    const isolated: SnapConfig = { threshold: 20, activeX: ['min'], activeY: [], guideOverhang: 10 };
    const result = computeSnap(bounds(100, 0, 10, 10), [bounds(90, 0, 1000, 10), bounds(106, 0, 1000, 10)], isolated);
    expect(result.x.delta).toBe(6);
    expect(result.x.guide?.position).toBe(106);
  });
});

describe('computeSnap — resize (single axis/point active)', () => {
  it('a right-moving edge only compares its own max point', () => {
    const activeX = resizeActivePoints('right');
    expect(activeX).toEqual(['max']);
    const result = computeSnap(bounds(0, 0, 108, 50), [bounds(200, 0, 50, 50)], {
      threshold: 20,
      activeX,
      activeY: [],
      guideOverhang: 10,
    });
    expect(result.x.delta).toBe(0);
  });

  it('a right-moving edge snaps to a nearby target min', () => {
    const activeX = resizeActivePoints('right');
    const result = computeSnap(bounds(0, 0, 195, 50), [bounds(200, 0, 50, 50)], {
      threshold: 20,
      activeX,
      activeY: [],
      guideOverhang: 10,
    });
    expect(result.x.delta).toBe(5);
  });

  it('a left-moving edge only compares its own min point', () => {
    expect(resizeActivePoints('left')).toEqual(['min']);
  });

  it('a top-moving edge only compares its own min point', () => {
    expect(resizeActivePoints('top')).toEqual(['min']);
  });

  it('a bottom-moving edge only compares its own max point', () => {
    expect(resizeActivePoints('bottom')).toEqual(['max']);
  });

  it('an untouched axis (none) yields no active points and never snaps', () => {
    expect(resizeActivePoints('none')).toEqual([]);
    const result = computeSnap(bounds(0, 0, 108, 50), [bounds(105, 0, 50, 50)], {
      threshold: 20,
      activeX: [],
      activeY: [],
      guideOverhang: 10,
    });
    expect(result.x.delta).toBe(0);
    expect(result.x.guide).toBeNull();
  });
});

describe('applyAxisSnap', () => {
  it('a right-moving snap only changes width', () => {
    const proposed = bounds(0, 0, 195, 50);
    const snap = { x: { delta: 5, guide: null }, y: { delta: 0, guide: null } };
    const result = applyAxisSnap(proposed, 'right', 'none', snap, 10);
    expect(result).toEqual({ x: 0, y: 0, width: 200, height: 50 });
  });

  it('a left-moving snap shifts x and width oppositely', () => {
    const proposed = bounds(105, 0, 95, 50);
    const snap = { x: { delta: -5, guide: null }, y: { delta: 0, guide: null } };
    const result = applyAxisSnap(proposed, 'left', 'none', snap, 10);
    expect(result.x).toBe(100);
    expect(result.width).toBe(100);
  });

  it('clamps to minSize', () => {
    const proposed = bounds(0, 0, 15, 50);
    const snap = { x: { delta: -10, guide: null }, y: { delta: 0, guide: null } };
    const result = applyAxisSnap(proposed, 'right', 'none', snap, 10);
    expect(result.width).toBe(10);
  });

  it('a "none" axis is left completely untouched even if a delta is present', () => {
    const proposed = bounds(0, 0, 50, 50);
    const snap = { x: { delta: 999, guide: null }, y: { delta: 0, guide: null } };
    const result = applyAxisSnap(proposed, 'none', 'none', snap, 10);
    expect(result).toEqual(proposed);
  });
});

describe('nearestCandidates', () => {
  it('sorts by center-to-center distance, closest first', () => {
    const target = bounds(0, 0, 10, 10);
    const far = bounds(1000, 1000, 10, 10);
    const near = bounds(20, 20, 10, 10);
    const result = nearestCandidates(target, [far, near]);
    expect(result).toEqual([near, far]);
  });

  it('caps to the given limit', () => {
    const target = bounds(0, 0, 10, 10);
    const many = Array.from({ length: 60 }, (_, i) => bounds(i * 100, 0, 10, 10));
    const result = nearestCandidates(target, many, 50);
    expect(result).toHaveLength(50);
  });

  it('defaults to a limit of 50', () => {
    const target = bounds(0, 0, 10, 10);
    const many = Array.from({ length: 60 }, (_, i) => bounds(i * 100, 0, 10, 10));
    expect(nearestCandidates(target, many)).toHaveLength(50);
  });
});
