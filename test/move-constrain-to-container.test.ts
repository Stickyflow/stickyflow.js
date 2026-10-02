import { describe, expect, it } from 'vitest';
import { clampMoveDelta } from '../src/runtime/interaction/move/geometry';
import type { DraggedEntity } from '../src/runtime/interaction/move/types';

function entity(
  bounds: { x: number; y: number; width: number; height: number },
  containerBounds?: typeof bounds,
): DraggedEntity {
  return {
    owner: { role: 'entity', id: 'e' },
    nodes: [],
    baseTransforms: [],
    overlays: [],
    overlayBaseTransforms: [],
    draggedBounds: bounds,
    liveLinks: [],
    containerBounds,
  };
}

describe('dragging an entity inside a frame/swimlane stays within its bounds', () => {
  const container = { x: 0, y: 0, width: 200, height: 100 };

  it('lets the entity move freely while still inside the container', () => {
    const child = entity({ x: 20, y: 20, width: 40, height: 20 }, container);
    expect(clampMoveDelta([child], 10, 5)).toEqual({ dx: 10, dy: 5 });
  });

  it('clamps a delta that would push the entity past the left/top edge', () => {
    const child = entity({ x: 20, y: 20, width: 40, height: 20 }, container);
    expect(clampMoveDelta([child], -50, -50)).toEqual({ dx: -20, dy: -20 });
  });

  it('clamps a delta that would push the entity past the right/bottom edge', () => {
    const child = entity({ x: 20, y: 20, width: 40, height: 20 }, container);
    expect(clampMoveDelta([child], 500, 500)).toEqual({ dx: 140, dy: 60 });
  });

  it('leaves an entity with no container unconstrained', () => {
    const free = entity({ x: 20, y: 20, width: 40, height: 20 });
    expect(clampMoveDelta([free], -500, 500)).toEqual({ dx: -500, dy: 500 });
  });

  it('uses the most restrictive bound across several dragged entities', () => {
    const a = entity({ x: 10, y: 10, width: 20, height: 20 }, container);
    const b = entity({ x: 170, y: 10, width: 20, height: 20 }, container);
    expect(clampMoveDelta([a, b], 100, 0)).toEqual({ dx: 10, dy: 0 });
  });

  it('does not constrain a container-plus-children cascade — entityCapture already omits containerBounds there', () => {
    const cascaded = entity({ x: 20, y: 20, width: 40, height: 20 }, undefined);
    expect(clampMoveDelta([cascaded], -500, 500)).toEqual({ dx: -500, dy: 500 });
  });
});
