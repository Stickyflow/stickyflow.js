import { describe, expect, it } from 'vitest';
import { captureDraggedEntities } from '../src/runtime/interaction/move/entityCapture';

(globalThis as { CSS?: { escape(value: string): string } }).CSS ??= { escape: value => value };

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FakeElement {
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  closest(selector: string): FakeElement | null;
  getBBox(): Box;
}

function fakeNode(attrs: Record<string, string>, bbox: Box): FakeElement {
  const self: FakeElement = {
    getAttribute: name => attrs[name] ?? null,
    hasAttribute: name => name in attrs,
    closest: selector => (selector === '[data-sf-id]' ? self : null),
    getBBox: () => bbox,
  };
  return self;
}

function fakeSvg(nodes: FakeElement[]) {
  return {
    querySelectorAll: (selector: string) => {
      const parts = selector.split(',').map(part => part.trim());
      const matches = nodes.filter(node =>
        parts.some(part => {
          const match = part.match(/\[([\w-]+)="([^"]*)"\]/);
          return match ? node.getAttribute(match[1]) === match[2] : false;
        }),
      );
      return matches as unknown as NodeListOf<Element>;
    },
  } as unknown as SVGSVGElement;
}

const frame = fakeNode(
  { 'data-sf-id': 'f', 'data-sf-role': 'frame', 'data-sf-primary': 'true' },
  { x: 0, y: 0, width: 200, height: 100 },
);
const child = fakeNode(
  { 'data-sf-id': 'child', 'data-sf-role': 'entity', 'data-sf-primary': 'true', 'data-sf-parent-frame': 'f' },
  { x: 20, y: 20, width: 40, height: 20 },
);

describe('capturing a dragged entity records its parent container bounds, unless the parent is dragged too', () => {
  it('records the parent frame bounds when only the child is being dragged', () => {
    const svg = fakeSvg([frame, child]);
    const [captured] = captureDraggedEntities(svg, [{ role: 'shape', id: 'child' }], new Set(['child']));

    expect(captured.containerBounds).toEqual({ x: 0, y: 0, width: 200, height: 100 });
  });

  it("omits containerBounds when the frame is dragged along with its child (a cascade shouldn't clamp itself)", () => {
    const svg = fakeSvg([frame, child]);
    const group = [
      { role: 'frame' as const, id: 'f' },
      { role: 'shape' as const, id: 'child' },
    ];
    const captured = captureDraggedEntities(svg, group, new Set(['f', 'child']));
    const childCapture = captured.find(entity => entity.owner.id === 'child');

    expect(childCapture?.containerBounds).toBeUndefined();
  });

  it('leaves an entity with no parent-frame tag unconstrained', () => {
    const orphan = fakeNode(
      { 'data-sf-id': 'lone', 'data-sf-role': 'entity', 'data-sf-primary': 'true' },
      { x: 5, y: 5, width: 10, height: 10 },
    );
    const svg = fakeSvg([orphan]);
    const [captured] = captureDraggedEntities(svg, [{ role: 'shape', id: 'lone' }], new Set(['lone']));

    expect(captured.containerBounds).toBeUndefined();
  });
});
