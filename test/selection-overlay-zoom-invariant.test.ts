import { describe, expect, it } from 'vitest';
import { quickDuplicateBubbles } from '../src/runtime/dom/selectionOverlay/quickDuplicate';
import { renderResizeHandles } from '../src/runtime/dom/selectionOverlay/resizeHandles';
import { screenPx } from '../src/runtime/dom/selectionOverlay/scale';
import { shapeSelectionOverlay } from '../src/runtime/dom/selectionOverlay/shape';

function fakeSvg(rectWidth: number, viewBoxWidth: number): SVGSVGElement {
  return {
    getBoundingClientRect: () => ({ width: rectWidth }),
    viewBox: { baseVal: { width: viewBoxWidth } },
  } as unknown as SVGSVGElement;
}

interface FakeSvgNode {
  tagName: string;
  attrs: Record<string, string>;
  style: Record<string, string>;
  children: FakeSvgNode[];
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  append(...nodes: FakeSvgNode[]): void;
  appendChild(node: FakeSvgNode): FakeSvgNode;
}

function fakeNode(tagName: string): FakeSvgNode {
  const attrs: Record<string, string> = {};
  const children: FakeSvgNode[] = [];
  return {
    tagName,
    attrs,
    style: {},
    children,
    setAttribute: (name, value) => {
      attrs[name] = value;
    },
    getAttribute: name => attrs[name] ?? null,
    append: (...nodes) => children.push(...nodes),
    appendChild: node => {
      children.push(node);
      return node;
    },
  };
}

function fakeDocument(): Document {
  return {
    createElementNS: (_ns: string, tag: string) => fakeNode(tag),
  } as unknown as Document;
}

function fakePrimary(bbox: { x: number; y: number; width: number; height: number }): SVGGraphicsElement {
  return {
    getBBox: () => bbox,
    getAttribute: () => null,
  } as unknown as SVGGraphicsElement;
}

describe('screenPx converts a target screen-pixel size into the SVG units that render as that many pixels', () => {
  it('returns the raw pixel value unchanged at 1:1 scale', () => {
    expect(screenPx(fakeSvg(100, 100), 6)).toBe(6);
  });

  it('shrinks in SVG-unit terms when the diagram is zoomed in (small viewBox in a large box)', () => {
    expect(screenPx(fakeSvg(700, 100), 6)).toBeCloseTo(6 / 7, 5);
  });

  it('grows in SVG-unit terms when the diagram is zoomed out (large viewBox in a small box)', () => {
    expect(screenPx(fakeSvg(100, 700), 6)).toBeCloseTo(42, 5);
  });
});

describe('resize handles stay a constant on-screen size regardless of zoom', () => {
  const bounds = { x: 0, y: 0, width: 100, height: 60 };

  it('renders 6-unit handles at 1:1 scale', () => {
    const [handle] = renderResizeHandles(fakeDocument(), bounds, fakeSvg(100, 100)) as unknown as FakeSvgNode[];
    expect(Number(handle.getAttribute('width'))).toBeCloseTo(6, 5);
  });

  it('renders much smaller handles (in SVG units) when heavily zoomed in, so they still look 6px on screen', () => {
    const zoomedIn = fakeSvg(700, 100);
    const [handle] = renderResizeHandles(fakeDocument(), bounds, zoomedIn) as unknown as FakeSvgNode[];
    expect(Number(handle.getAttribute('width'))).toBeCloseTo(6 / 7, 5);
  });
});

describe('quick-duplicate bubbles stay a constant on-screen size regardless of zoom', () => {
  const primary = fakePrimary({ x: 0, y: 0, width: 100, height: 60 });

  it('uses the 8-unit radius at 1:1 scale', () => {
    const group = quickDuplicateBubbles(fakeDocument(), primary, 'e', fakeSvg(100, 100)) as unknown as FakeSvgNode;
    const bubble = group.children.find(node => node.tagName === 'circle');
    expect(Number(bubble?.getAttribute('r'))).toBeCloseTo(8, 5);
  });

  it('shrinks the radius (in SVG units) when heavily zoomed in', () => {
    const group = quickDuplicateBubbles(fakeDocument(), primary, 'e', fakeSvg(700, 100)) as unknown as FakeSvgNode;
    const bubble = group.children.find(node => node.tagName === 'circle');
    expect(Number(bubble?.getAttribute('r'))).toBeCloseTo(8 / 7, 5);
  });
});

describe("the selection ring's stroke stays a constant on-screen width regardless of zoom", () => {
  const primary = fakePrimary({ x: 0, y: 0, width: 100, height: 60 });

  it('uses the 3-unit stroke width at 1:1 scale', () => {
    const group = shapeSelectionOverlay(fakeDocument(), primary, 'e', fakeSvg(100, 100)) as unknown as FakeSvgNode;
    const ring = group.children.find(node => node.tagName === 'rect');
    expect(Number(ring?.getAttribute('stroke-width'))).toBeCloseTo(3, 5);
  });

  it('shrinks the stroke width (in SVG units) when heavily zoomed in', () => {
    const group = shapeSelectionOverlay(fakeDocument(), primary, 'e', fakeSvg(700, 100)) as unknown as FakeSvgNode;
    const ring = group.children.find(node => node.tagName === 'rect');
    expect(Number(ring?.getAttribute('stroke-width'))).toBeCloseTo(3 / 7, 5);
  });
});
