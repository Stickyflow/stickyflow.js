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

describe('live resize preview rebuilds the frame boundary path, not just a rect', () => {
  it('squares the same corner the tag encodes while the live bounds change', () => {
    const node = fakePathNode({ 'data-sf-corner-radius': '12', 'data-sf-square-corner': 'topLeft' });

    applySingleNodeBounds(node as unknown as SVGGraphicsElement, null, { x: 10, y: 20, width: 300, height: 150 });

    expect(node.values.d).toBe(
      'M 10 20 H 298 A 12 12 0 0 1 310 32 V 158 A 12 12 0 0 1 298 170 H 22 A 12 12 0 0 1 10 158 V 20 Z',
    );
  });

  it('leaves an unrelated path node (no kind, no corner-radius tag) untouched', () => {
    const node = fakePathNode({});

    applySingleNodeBounds(node as unknown as SVGGraphicsElement, null, { x: 0, y: 0, width: 100, height: 50 });

    expect(node.values.d).toBeUndefined();
  });
});
