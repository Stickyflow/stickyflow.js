import { describe, expect, it } from 'vitest';
import { roundedPolygonPath } from '../src/renderScene/scene/roundedPolygonPath';

const SQUARE = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

describe('roundedPolygonPath', () => {
  it('preserves a polygon when the radius is zero', () => {
    expect(roundedPolygonPath(SQUARE, 0)).toBe('M 0 0 L 100 0 L 100 100 L 0 100 Z');
  });

  it('rounds every corner with quadratic curves', () => {
    expect(roundedPolygonPath(SQUARE, 10)).toBe(
      'M 10 0 L 90 0 Q 100 0 100 10 L 100 90 Q 100 100 90 100 L 10 100 Q 0 100 0 90 L 0 10 Q 0 0 10 0 Z',
    );
  });
});
