import { describe, expect, it } from 'vitest';
import {
  type RadarFrame,
  radarCategoryCount,
  radarRadius,
  radarSeriesPath,
  radarValueAtPoint,
  radarVertexPoint,
} from '../src/rendering/charts/primitives/radarShape';

const frame: RadarFrame = { centerX: 100, centerY: 100, radius: 50, min: 0, max: 10, count: 4, curved: false };

describe('radarRadius / radarCategoryCount', () => {
  it('reserves label space and never collapses below 8px', () => {
    expect(radarRadius(400, 300, 12)).toBeCloseTo(150 - 38.4, 10);
    expect(radarRadius(20, 20, 12)).toBe(8);
  });

  it('reserves only a hairline margin when the category labels are hidden', () => {
    expect(radarRadius(400, 300, 12, false)).toBeCloseTo(150 - 6, 10);
    expect(radarRadius(400, 300, 12, false)).toBeGreaterThan(radarRadius(400, 300, 12, true));
  });

  it('takes the configured category count, falling back to the data length, floored at 3', () => {
    expect(radarCategoryCount(6, 4)).toBe(6);
    expect(radarCategoryCount(0, 5)).toBe(5);
    expect(radarCategoryCount(0, 2)).toBe(3);
  });
});

describe('radarVertexPoint', () => {
  it('places index 0 straight up from the center, scaled by the value', () => {
    expect(radarVertexPoint(frame, 0, 10)).toEqual({ x: 100, y: 50 });
    expect(radarVertexPoint(frame, 0, 5)).toEqual({ x: 100, y: 75 });
    expect(radarVertexPoint(frame, 0, 0)).toEqual({ x: 100, y: 100 });
  });

  it('steps clockwise by a full turn over count spokes', () => {
    const right = radarVertexPoint(frame, 1, 10);
    expect(right.x).toBeCloseTo(150, 10);
    expect(right.y).toBeCloseTo(100, 10);
  });

  it('clamps a value past the axis max to the outer radius', () => {
    expect(radarVertexPoint(frame, 0, 999)).toEqual({ x: 100, y: 50 });
    expect(radarVertexPoint(frame, 0, -50)).toEqual({ x: 100, y: 100 });
  });
});

describe('radarValueAtPoint', () => {
  it('is the inverse of radarVertexPoint along the spoke', () => {
    for (const value of [0, 2.5, 5, 7.3, 10]) {
      const point = radarVertexPoint(frame, 2, value);
      expect(radarValueAtPoint(frame, 2, point.x, point.y)).toBeCloseTo(value, 10);
    }
  });

  it('projects an off-spoke pointer onto the spoke direction', () => {
    const value = radarValueAtPoint(frame, 0, 130, 75);
    expect(value).toBeCloseTo(5, 10);
  });

  it('clamps to the axis range at both ends', () => {
    expect(radarValueAtPoint(frame, 0, 100, 20)).toBe(10);
    expect(radarValueAtPoint(frame, 0, 100, 160)).toBe(0);
  });
});

describe('radarSeriesPath', () => {
  it('closes a straight polygon through the vertices', () => {
    const path = radarSeriesPath(
      [
        { x: 100, y: 50 },
        { x: 150, y: 100 },
        { x: 100, y: 150 },
      ],
      false,
    );
    expect(path).toBe('M 100 50 L 150 100 L 100 150 Z');
  });

  it('emits a cubic-curve path when curved', () => {
    const path = radarSeriesPath(
      [
        { x: 100, y: 50 },
        { x: 150, y: 100 },
        { x: 100, y: 150 },
        { x: 50, y: 100 },
      ],
      true,
    );
    expect(path).toMatch(/^M .* C /);
    expect(path.endsWith(' Z')).toBe(true);
  });
});
