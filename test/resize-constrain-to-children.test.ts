import { describe, expect, it } from 'vitest';
import { childrenUnionBounds } from '../src/interaction/containerGeometry';
import { clampResizeToChildren } from '../src/interaction/resize/geometry';

(globalThis as { CSS?: { escape(value: string): string } }).CSS ??= { escape: value => value };

describe('clampResizeToChildren keeps a container from shrinking past its own children', () => {
  const children = { x: 20, y: 20, width: 100, height: 60 };

  it('leaves a resize alone when it still fully contains the children', () => {
    const proposed = { x: 0, y: 0, width: 200, height: 150 };
    expect(clampResizeToChildren(proposed, children)).toEqual(proposed);
  });

  it('pushes the shrinking edge back out to the nearest child edge, per side', () => {
    const proposed = { x: 50, y: 50, width: 100, height: 100 };
    expect(clampResizeToChildren(proposed, children)).toEqual({ x: 20, y: 20, width: 130, height: 130 });
  });

  it('does nothing when the container has no children', () => {
    const proposed = { x: 50, y: 50, width: 10, height: 10 };
    expect(clampResizeToChildren(proposed, undefined)).toEqual(proposed);
  });
});

describe('childrenUnionBounds reads every entity tagged with the container as its parent', () => {
  function fakeSvg(boxes: Array<{ x: number; y: number; width: number; height: number }>) {
    const elements = boxes.map(box => ({ getBBox: () => box }));
    return {
      querySelectorAll: () => elements as unknown as NodeListOf<Element>,
    } as unknown as SVGSVGElement;
  }

  it('returns undefined for a container with no children', () => {
    expect(childrenUnionBounds(fakeSvg([]), 'f')).toBeUndefined();
  });

  it("returns a single child's own bounds unchanged", () => {
    const box = { x: 10, y: 10, width: 30, height: 20 };
    expect(childrenUnionBounds(fakeSvg([box]), 'f')).toEqual(box);
  });

  it('unions several children into their combined bounding box', () => {
    const boxes = [
      { x: 0, y: 0, width: 20, height: 20 },
      { x: 100, y: 50, width: 20, height: 20 },
    ];
    expect(childrenUnionBounds(fakeSvg(boxes), 'f')).toEqual({ x: 0, y: 0, width: 120, height: 70 });
  });
});
