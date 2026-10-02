import { describe, expect, it } from 'vitest';
import { applyCompositeScale } from '../src/runtime/interaction/resize/geometryPreview';

function fakeNode(tagName: string, attrs: Record<string, string>) {
  const values = { ...attrs };
  return {
    tagName,
    getAttribute: (name: string) => values[name] ?? null,
    setAttribute: (name: string, value: string) => {
      values[name] = value;
    },
    values,
  };
}

describe('applyCompositeScale keeps text glyphs from stretching', () => {
  it('gives structural nodes a scale transform', () => {
    const rect = fakeNode('rect', {});
    applyCompositeScale(
      [rect as unknown as SVGGraphicsElement],
      { x: 0, y: 0, width: 100, height: 50 },
      { x: 0, y: 0, width: 200, height: 50 },
    );
    expect(rect.values.transform).toContain('scale(2');
  });

  it('gives text nodes a pure translate, no scale', () => {
    const text = fakeNode('text', { x: '50', y: '25' });
    applyCompositeScale(
      [text as unknown as SVGGraphicsElement],
      { x: 0, y: 0, width: 100, height: 50 },
      { x: 0, y: 0, width: 200, height: 50 },
    );
    const transform = text.values.transform ?? '';
    expect(transform).not.toContain('scale');
    expect(transform).toMatch(/^translate\(/);
  });

  it('moves the text anchor to the same place the scale transform would have', () => {
    const text = fakeNode('text', { x: '60', y: '25' });
    applyCompositeScale(
      [text as unknown as SVGGraphicsElement],
      { x: 0, y: 0, width: 100, height: 50 },
      { x: 10, y: 0, width: 200, height: 50 },
    );
    const match = text.values.transform?.match(/translate\(([-\d.]+) ([-\d.]+)\)/);
    expect(match).not.toBeNull();
    const [, dx, dy] = match ?? [];
    expect(Number(dx)).toBeCloseTo(10 + 2 * 60 - 60, 6);
    expect(Number(dy)).toBeCloseTo(0, 6);
  });

  it('leaves text untouched when nothing actually resized', () => {
    const text = fakeNode('text', { x: '50', y: '25' });
    applyCompositeScale(
      [text as unknown as SVGGraphicsElement],
      { x: 0, y: 0, width: 100, height: 50 },
      { x: 0, y: 0, width: 100, height: 50 },
    );
    expect(text.values.transform).toBe('translate(0 0)');
  });
});
