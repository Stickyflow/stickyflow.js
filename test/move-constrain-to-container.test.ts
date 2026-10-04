import { describe, expect, it } from 'vitest';
import { clampMoveDelta } from '../src/runtime/interaction/move/geometry';
import type { DraggedCanvasObject } from '../src/runtime/interaction/move/types';

function canvasObject(
  bounds: { x: number; y: number; width: number; height: number },
  containerBounds?: typeof bounds,
): DraggedCanvasObject {
  return {
    owner: { role: 'shape', id: 'e' },
    nodes: [],
    baseTransforms: [],
    overlays: [],
    overlayBaseTransforms: [],
    draggedBounds: bounds,
    liveLinks: [],
    liveFaceLinks: [],
    containerBounds,
  };
}

describe('dragging a canvas object inside a frame/swimlane stays within its bounds', () => {
  const container = { x: 0, y: 0, width: 200, height: 100 };

  it('lets the canvas object move freely while still inside the container', () => {
    const child = canvasObject({ x: 20, y: 20, width: 40, height: 20 }, container);
    expect(clampMoveDelta([child], 10, 5)).toEqual({ dx: 10, dy: 5 });
  });

  it('clamps a delta that would push the canvas object past the left/top edge', () => {
    const child = canvasObject({ x: 20, y: 20, width: 40, height: 20 }, container);
    expect(clampMoveDelta([child], -50, -50)).toEqual({ dx: -20, dy: -20 });
  });

  it('clamps a delta that would push the canvas object past the right/bottom edge', () => {
    const child = canvasObject({ x: 20, y: 20, width: 40, height: 20 }, container);
    expect(clampMoveDelta([child], 500, 500)).toEqual({ dx: 140, dy: 60 });
  });

  it('leaves a canvas object with no container unconstrained', () => {
    const free = canvasObject({ x: 20, y: 20, width: 40, height: 20 });
    expect(clampMoveDelta([free], -500, 500)).toEqual({ dx: -500, dy: 500 });
  });

  it('uses the most restrictive bound across several dragged entities', () => {
    const a = canvasObject({ x: 10, y: 10, width: 20, height: 20 }, container);
    const b = canvasObject({ x: 170, y: 10, width: 20, height: 20 }, container);
    expect(clampMoveDelta([a, b], 100, 0)).toEqual({ dx: 10, dy: 0 });
  });

  it('does not constrain a container-plus-children cascade — canvasObjectCapture already omits containerBounds there', () => {
    const cascaded = canvasObject({ x: 20, y: 20, width: 40, height: 20 }, undefined);
    expect(clampMoveDelta([cascaded], -500, 500)).toEqual({ dx: -500, dy: 500 });
  });
});
