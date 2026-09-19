import { describe, expect, it } from 'vitest';
import { createResizeDragState } from '../src/interaction/resize/state';

(globalThis as { CSS?: { escape(value: string): string } }).CSS ??= { escape: value => value };

interface FakeElement {
  tagName: string;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  setAttribute(name: string, value: string): void;
  closest(selector: string): FakeElement | null;
  querySelector(selector: string): FakeElement | null;
  getBBox(): { x: number; y: number; width: number; height: number };
  setPointerCapture?(id: number): void;
}

function fakeNode(
  tagName: string,
  attrs: Record<string, string>,
  bbox = { x: 0, y: 0, width: 0, height: 0 },
): FakeElement {
  const values = { ...attrs };
  const self: FakeElement = {
    tagName,
    getAttribute: name => values[name] ?? null,
    hasAttribute: name => name in values,
    setAttribute: (name, value) => {
      values[name] = value;
    },
    closest: selector => (matchesSelector(self, selector) ? self : null),
    querySelector: () => null,
    getBBox: () => bbox,
    setPointerCapture: () => {},
  };
  return self;
}

function matchesSelector(node: FakeElement, selector: string): boolean {
  return selector.split(',').some(part => {
    const match = part.trim().match(/^([\w-]*)\[([\w-]+)(?:="([^"]*)")?\]$/);
    if (!match) {
      return false;
    }
    const [, tag, attr, value] = match;
    if (tag && node.tagName !== tag) {
      return false;
    }
    return value === undefined ? node.hasAttribute(attr) : node.getAttribute(attr) === value;
  });
}

function fakeSvg(nodes: FakeElement[]) {
  return {
    querySelectorAll: (selector: string) =>
      nodes.filter(node => matchesSelector(node, selector)) as unknown as NodeListOf<Element>,
  } as unknown as SVGSVGElement;
}

function fakeResizeEvent(handle: FakeElement, pointerId = 1): PointerEvent {
  return { target: handle, pointerId } as unknown as PointerEvent;
}

describe("resizing a frame never hijacks the tab's text as if it were an inline shape label", () => {
  const overlay = fakeNode('g', { 'data-sf-selection-overlay': 'f' });
  const handle = fakeNode('rect', { 'data-sf-resize-handle': 'bottom-right' });
  handle.closest = selector => {
    if (matchesSelector(handle, selector)) {
      return handle;
    }
    if (matchesSelector(overlay, selector)) {
      return overlay;
    }
    return null;
  };
  const frameBoundary = fakeNode(
    'path',
    { 'data-sf-id': 'f', 'data-sf-role': 'frame', 'data-sf-primary': 'true', 'aria-label': 'Checkout' },
    { x: 0, y: 0, width: 300, height: 200 },
  );
  const tabText = fakeNode('text', { 'data-sf-id': 'f', 'data-sf-role': 'frame' });
  const svg = fakeSvg([overlay, handle, frameBoundary, tabText]);

  it('captures no live-text target for a frame resize, so the tab text is left alone during the drag', () => {
    const drag = createResizeDragState(svg, fakeResizeEvent(handle));

    expect(drag).not.toBeNull();
    expect(drag?.text).toBeNull();
  });

  it("still resizes the frame's own geometry normally", () => {
    const drag = createResizeDragState(svg, fakeResizeEvent(handle));

    expect(drag?.owner).toEqual({ role: 'frame', id: 'f', label: 'Checkout' });
    expect(drag?.startBounds).toEqual({ x: 0, y: 0, width: 300, height: 200 });
  });

  it('still captures live text for a plain shape (the bug was container-specific)', () => {
    const shapeOverlay = fakeNode('g', { 'data-sf-selection-overlay': 's' });
    const shapeHandle = fakeNode('rect', { 'data-sf-resize-handle': 'bottom-right' });
    shapeHandle.closest = selector => {
      if (matchesSelector(shapeHandle, selector)) {
        return shapeHandle;
      }
      if (matchesSelector(shapeOverlay, selector)) {
        return shapeOverlay;
      }
      return null;
    };
    const shapePrimary = fakeNode(
      'rect',
      { 'data-sf-id': 's', 'data-sf-role': 'entity', 'data-sf-primary': 'true', 'aria-label': 'Box' },
      { x: 0, y: 0, width: 100, height: 60 },
    );
    const shapeText = fakeNode('text', { 'data-sf-id': 's', 'data-sf-role': 'entity' });
    const shapeSvg = fakeSvg([shapeOverlay, shapeHandle, shapePrimary, shapeText]);

    const drag = createResizeDragState(shapeSvg, fakeResizeEvent(shapeHandle));

    expect(drag?.text).not.toBeNull();
    expect(drag?.text?.el).toBe(shapeText);
  });
});
