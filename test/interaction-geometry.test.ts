import { describe, expect, it } from 'vitest';
import { parseValueScale, pixelForValue, valueAtPixel } from '../src/interaction/chartValue/scale';
import { offsetBounds } from '../src/interaction/move/geometry';
import { HANDLE_AXES, MIN_SIZE, resizedBounds } from '../src/interaction/resize/geometry';
import type { Rect } from '../src/model/geometry/router';

const box: Rect = { x: 100, y: 50, width: 200, height: 80 };

describe('offsetBounds', () => {
  it('translates position and keeps the size', () => {
    expect(offsetBounds(box, 10, -5)).toEqual({ x: 110, y: 45, width: 200, height: 80 });
  });

  it('is a no-op for a zero delta', () => {
    expect(offsetBounds(box, 0, 0)).toEqual(box);
  });
});

describe('resizedBounds', () => {
  it('covers every handle', () => {
    expect(Object.keys(HANDLE_AXES).sort()).toEqual(
      ['bottom', 'bottom-left', 'bottom-right', 'left', 'right', 'top', 'top-left', 'top-right'].sort(),
    );
  });

  it('drags the right edge without moving the left one', () => {
    const next = resizedBounds(box, 'right', { x: 360, y: 0 });
    expect(next).toEqual({ x: 100, y: 50, width: 260, height: 80 });
  });

  it('drags the left edge and moves the origin', () => {
    const next = resizedBounds(box, 'left', { x: 60, y: 0 });
    expect(next).toEqual({ x: 60, y: 50, width: 240, height: 80 });
  });

  it('resizes both axes from a corner', () => {
    const next = resizedBounds(box, 'bottom-right', { x: 400, y: 200 });
    expect(next).toEqual({ x: 100, y: 50, width: 300, height: 150 });
  });

  it('leaves the untouched axis alone for an edge handle', () => {
    expect(resizedBounds(box, 'top', { x: 9999, y: 20 })).toMatchObject({ x: 100, width: 200 });
    expect(resizedBounds(box, 'left', { x: 60, y: 9999 })).toMatchObject({ y: 50, height: 80 });
  });

  it('clamps to MIN_SIZE instead of collapsing', () => {
    const next = resizedBounds(box, 'right', { x: 100, y: 0 });
    expect(next.width).toBe(MIN_SIZE);
  });

  it('flips instead of producing a negative size when dragged past the fixed edge', () => {
    const next = resizedBounds(box, 'right', { x: 40, y: 0 });
    expect(next.width).toBeGreaterThanOrEqual(MIN_SIZE);
    expect(next.x).toBeLessThanOrEqual(100);
    expect(next.x + next.width).toBeCloseTo(100, 5);
  });
});

describe('chart value scale', () => {
  const scale = { plotY: 10, plotHeight: 100, min: 0, max: 50 };

  it('parses a well-formed data-sf-value-scale attribute', () => {
    const element = { getAttribute: () => '10,100,0,50' } as unknown as Element;
    expect(parseValueScale(element)).toEqual(scale);
  });

  it('rejects malformed, zero-height or degenerate scales', () => {
    const attr = (value: string | null) => ({ getAttribute: () => value }) as unknown as Element;
    expect(parseValueScale(null)).toBeNull();
    expect(parseValueScale(attr(null))).toBeNull();
    expect(parseValueScale(attr('nope'))).toBeNull();
    expect(parseValueScale(attr('10,0,0,50'))).toBeNull();
    expect(parseValueScale(attr('10,100,7,7'))).toBeNull();
  });

  it('maps the plot bottom to min and the top to max', () => {
    expect(valueAtPixel(110, scale)).toBeCloseTo(0, 5);
    expect(valueAtPixel(10, scale)).toBeCloseTo(50, 5);
    expect(valueAtPixel(60, scale)).toBeCloseTo(25, 5);
  });

  it('clamps a pointer dragged outside the plot', () => {
    expect(valueAtPixel(-200, scale)).toBe(50);
    expect(valueAtPixel(9999, scale)).toBe(0);
  });

  it('round-trips value and pixel', () => {
    for (const value of [0, 12.5, 25, 49.9, 50]) {
      expect(valueAtPixel(pixelForValue(value, scale), scale)).toBeCloseTo(value, 5);
    }
  });
});
