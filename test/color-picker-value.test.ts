import { describe, expect, it } from 'vitest';
import { hexToHsv, hexToRgb, hsvToHex, normalizeHex, rgbToHex } from '../src/runtime/interaction/colorEdit/color';
import { formatGradient, gradientCss, parseGradient } from '../src/runtime/interaction/colorEdit/gradientValue';
import { formatPickerValue, seedFrom, toGradient, toSolid } from '../src/runtime/interaction/colorEdit/value';

describe('normalizeHex', () => {
  it('expands shorthand and lowercases', () => {
    expect(normalizeHex('#AbC')).toBe('#aabbcc');
  });

  it('accepts a missing hash', () => {
    expect(normalizeHex('6d5ef0')).toBe('#6d5ef0');
  });

  it('rejects anything that is not a hex color', () => {
    expect(normalizeHex('rebeccapurple')).toBeNull();
    expect(normalizeHex('#12345')).toBeNull();
    expect(normalizeHex('')).toBeNull();
  });
});

describe('hsv round trip', () => {
  it('returns the same hex it started from', () => {
    for (const hex of ['#6d5ef0', '#000000', '#ffffff', '#db2777', '#4c1d95']) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    }
  });

  it('keeps rgb and hex in step', () => {
    expect(rgbToHex(hexToRgb('#db2777'))).toBe('#db2777');
  });

  it('clamps channels rather than wrapping them', () => {
    expect(rgbToHex({ r: -20, g: 300, b: 128 })).toBe('#00ff80');
  });
});

describe('parseGradient', () => {
  it('reads the angle and every stop', () => {
    expect(parseGradient('gradient(90, #7c3aed 0%, #db2777 50%, #4c1d95 100%)')).toEqual({
      angle: 90,
      stops: [
        { color: '#7c3aed', position: 0 },
        { color: '#db2777', position: 50 },
        { color: '#4c1d95', position: 100 },
      ],
    });
  });

  it('rejects a solid color and a one-stop gradient', () => {
    expect(parseGradient('#7c3aed')).toBeNull();
    expect(parseGradient('gradient(90, #7c3aed 0%)')).toBeNull();
  });

  it('survives a format round trip', () => {
    const source = 'gradient(180, #7c3aed 0%, #4c1d95 100%)';
    const parsed = parseGradient(source);
    expect(parsed && formatGradient(parsed)).toBe(source);
  });

  it('sorts stops by position when formatting', () => {
    expect(
      formatGradient({
        angle: 0,
        stops: [
          { color: '#ffffff', position: 100 },
          { color: '#000000', position: 0 },
        ],
      }),
    ).toBe('gradient(0, #000000 0%, #ffffff 100%)');
  });
});

describe('gradientCss', () => {
  it('rotates the sfl angle into css degrees, where 0 is left to right', () => {
    expect(
      gradientCss({
        angle: 0,
        stops: [
          { color: '#000000', position: 0 },
          { color: '#ffffff', position: 100 },
        ],
      }),
    ).toBe('linear-gradient(90deg, #000000 0%, #ffffff 100%)');
  });
});

describe('seedFrom', () => {
  it('reads a solid fill', () => {
    expect(seedFrom('#6d5ef0', null)).toEqual({ mode: 'solid', color: '#6d5ef0', alpha: 1 });
  });

  it('falls back to a neutral seed rather than black for an unresolvable fill', () => {
    expect(seedFrom('url(#missing)', null)).toEqual({ mode: 'solid', color: '#888888', alpha: 1 });
  });

  it('prefers resolved gradient stops over the raw fill', () => {
    const stops = [
      { color: '#aaaaaa', position: 0 },
      { color: '#bbbbbb', position: 100 },
    ];
    expect(seedFrom('url(#g)', { angle: 45, stops })).toEqual({ mode: 'gradient', angle: 45, stops });
  });
});

describe('switching between solid and gradient', () => {
  it('derives a two-stop gradient from a solid color', () => {
    const gradient = toGradient({ mode: 'solid', color: '#6d5ef0' });
    expect(gradient.angle).toBe(90);
    expect(gradient.stops).toHaveLength(2);
    expect(gradient.stops[0]).toEqual({ color: '#6d5ef0', position: 0 });
    expect(gradient.stops[1].color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('takes the first stop when collapsing a gradient back to solid', () => {
    expect(
      toSolid({
        mode: 'gradient',
        angle: 90,
        stops: [
          { color: '#bbbbbb', position: 100 },
          { color: '#aaaaaa', position: 0 },
        ],
      }),
    ).toBe('#aaaaaa');
  });

  it('formats each mode into the value the host writes back', () => {
    expect(formatPickerValue({ mode: 'solid', color: '#6d5ef0' })).toBe('#6d5ef0');
    expect(
      formatPickerValue({
        mode: 'gradient',
        angle: 90,
        stops: [
          { color: '#000000', position: 0 },
          { color: '#ffffff', position: 100 },
        ],
      }),
    ).toBe('gradient(90, #000000 0%, #ffffff 100%)');
  });
});
