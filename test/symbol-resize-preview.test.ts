import { describe, expect, it } from 'vitest';
import { applySingleNodeBounds } from '../src/runtime/interaction/resize/geometryPreview';

function fakePathNode(attrs: Record<string, string>) {
  const values = { ...attrs };
  return {
    tagName: 'path',
    getAttribute: (name: string) => values[name] ?? null,
    hasAttribute: (name: string) => name in values,
    setAttribute: (name: string, value: string) => {
      values[name] = value;
    },
    values,
  };
}

describe('live resize preview redraws a Symbol shape from its points, not just after mouseup', () => {
  it('rescales the exact polygon to the live drag bounds', () => {
    const node = fakePathNode({
      'data-sf-symbol-points': JSON.stringify([
        [0.5, 0],
        [1, 1],
        [0, 1],
      ]),
      'data-sf-symbol-tension': '0',
    });

    applySingleNodeBounds(node as unknown as SVGGraphicsElement, 'symbol', { x: 10, y: 20, width: 200, height: 100 });

    expect(node.values.d).toBe('M 110 20 L 210 120 L 10 120 Z');
  });

  it('routes through a Catmull-Rom curve when the Symbol has tension, same as the static render', () => {
    const node = fakePathNode({
      'data-sf-symbol-points': JSON.stringify([
        [0.5, 0],
        [1, 0.5],
        [0.5, 1],
        [0, 0.5],
      ]),
      'data-sf-symbol-tension': '0.5',
    });

    applySingleNodeBounds(node as unknown as SVGGraphicsElement, 'symbol', { x: 0, y: 0, width: 100, height: 100 });

    expect(node.values.d).toMatch(/^M 50 0 C/);
  });

  it('falls back to leaving the path untouched when a symbol node has no points data (defensive, should not happen)', () => {
    const node = fakePathNode({});

    applySingleNodeBounds(node as unknown as SVGGraphicsElement, 'symbol', { x: 0, y: 0, width: 100, height: 50 });

    expect(node.values.d).toBeUndefined();
  });
});
