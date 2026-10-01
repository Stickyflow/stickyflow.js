import { describe, expect, it } from 'vitest';
import { getLinkColorAtPoint, getLinkEndpointColor, getLinkStrokeColor } from '../src/rendering/scene/linkPaint';
import { getDashArray } from '../src/rendering/scene/linkStroke';

const gradient = {
  type: 'gradient' as const,
  angle: 0,
  stops: [
    { position: 0, color: '#000000' },
    { position: 100, color: '#ffffff' },
  ],
};

describe('link paint interpretation', () => {
  it('resolves the representative stroke and endpoint colors from a gradient', () => {
    expect(getLinkStrokeColor(gradient)).toBe('#000000');
    expect(getLinkEndpointColor(gradient, 'start')).toBe('#000000');
    expect(getLinkEndpointColor(gradient, 'end')).toBe('#ffffff');
  });

  it('interpolates the visible color at a projected link position', () => {
    expect(getLinkColorAtPoint(gradient, [0, 0, 100, 0], { x: 50, y: 20 })).toBe('#808080');
  });

  it('converts stroke styles into scene dash arrays', () => {
    expect(getDashArray(2, 'dashed')).toEqual([16, 8]);
    expect(getDashArray(2, 'dotted')).toEqual([4, 6]);
    expect(getDashArray(2, 'solid')).toBeUndefined();
  });
});
