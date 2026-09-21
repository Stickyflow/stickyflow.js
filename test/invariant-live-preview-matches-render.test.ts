import { describe, expect, it } from 'vitest';
import { render } from '../src/index';
import { previewPathData, routePreviewLink } from '../src/interaction/linkPreview/geometry';
import { applySingleNodeBounds } from '../src/interaction/resize/geometryPreview';

// Verifies the claim behind this session's Symbol resize-snap fix, empirically
// rather than by reading imports: does the hand-rolled live-preview path
// (applySingleNodeBounds, run once per pointermove) produce byte-identical
// geometry to a real render() at the SAME final bounds? If it doesn't, a live
// drag visibly disagrees with what release lands on, exactly like the bugs
// fixed this session. Seeded from a REAL rendered element (not a hand-typed
// assumption of what the renderer emits), moved via the preview path, then
// compared against a second real render at the end bounds.

function fakeElement(tag: string, attrs: Record<string, string>) {
  const values = { ...attrs };
  return {
    tagName: tag,
    getAttribute: (name: string) => values[name] ?? null,
    hasAttribute: (name: string) => name in values,
    setAttribute: (name: string, value: string) => {
      values[name] = value;
    },
    values,
  };
}

function attrsOf(svg: string, id: string): { tag: string; attrs: Record<string, string> } {
  const match = new RegExp(`<(rect|ellipse|path) id="sf-shape-${id}"([^>]*)/?>`).exec(svg);
  if (!match) {
    throw new Error(`no shape node found for ${id} in:\n${svg}`);
  }
  const [, tag, rest] = match;
  const attrs: Record<string, string> = {};
  for (const attrMatch of rest.matchAll(/([\w-]+)="([^"]*)"/g)) {
    attrs[attrMatch[1]] = attrMatch[2];
  }
  return { tag, attrs };
}

function shapeSfl(kind: string, box: { x: number; y: number; width: number; height: number }, extra = ''): string {
  return `sfl 1.4

Model M {
  Entity e {
    style { shape: ${kind}${extra} }
    layout { position: ${box.x}, ${box.y}; size: ${box.width}, ${box.height} }
  }
}
`;
}

const GEOMETRY_ATTRS = ['x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'd'];

function geometryOf(attrs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of GEOMETRY_ATTRS) {
    if (key in attrs) {
      out[key] = attrs[key];
    }
  }
  return out;
}

const START = { x: 0, y: 0, width: 100, height: 60 };
const END = { x: 40, y: 25, width: 180, height: 110 };

const KINDS: Array<{ kind: string; extra?: string }> = [
  { kind: 'rectangle' },
  { kind: 'pill' },
  { kind: 'rounded_rectangle', extra: '; cornerRadius: 18' },
  { kind: 'oval' },
  { kind: 'triangle' },
  { kind: 'diamond' },
  { kind: 'hexagon' },
  { kind: 'parallelogram' },
  { kind: 'trapezoid' },
  { kind: 'document' },
  { kind: 'note' },
  { kind: 'cloud' },
  { kind: 'predefined_process' },
];

describe('the live-preview path (single-node kinds) produces the same geometry as a real render at the same end bounds', () => {
  for (const { kind, extra } of KINDS) {
    it(kind, () => {
      const startSvg = render(shapeSfl(kind, START, extra)).svg;
      const { tag, attrs } = attrsOf(startSvg, 'e');
      const node = fakeElement(tag, attrs);

      applySingleNodeBounds(node as unknown as SVGGraphicsElement, kind, END);

      const endSvg = render(shapeSfl(kind, END, extra)).svg;
      const realEnd = attrsOf(endSvg, 'e');

      expect(geometryOf(node.values)).toEqual(geometryOf(realEnd.attrs));
    });
  }
});

describe('a Symbol also matches, seeded from a real render, for a points list that does not fill its box', () => {
  it('kite-shaped Symbol', () => {
    const sfl = (box: typeof START) => `sfl 1.4

Symbol Kite {
  points: [[0.5, 0], [1, 0.4], [0.5, 0.8], [0, 0.4]]
}

Model M {
  Entity e {
    shape: Kite
    layout { position: ${box.x}, ${box.y}; size: ${box.width}, ${box.height} }
  }
}
`;
    const startSvg = render(sfl(START)).svg;
    const { tag, attrs } = attrsOf(startSvg, 'e');
    const node = fakeElement(tag, attrs);

    applySingleNodeBounds(node as unknown as SVGGraphicsElement, 'symbol', END);

    const endSvg = render(sfl(END)).svg;
    const realEnd = attrsOf(endSvg, 'e');
    expect(node.values.d).toBe(realEnd.attrs.d);
  });
});

describe('a frame boundary also matches, corner-squared, seeded from a real render', () => {
  it('frame with a squared top-left corner', () => {
    const sfl = (box: typeof START) => `sfl 1.4

Model M {
  Container f {
    kind: frame
    text: "F"
    style { cornerRadius: 16 }
    layout { position: ${box.x}, ${box.y}; size: ${box.width}, ${box.height} }
  }
}
`;
    const startSvg = render(sfl(START)).svg;
    const match = /<path id="sf-frame-f"([^>]*)\/>/.exec(startSvg);
    if (!match) {
      throw new Error(`no frame path found in:\n${startSvg}`);
    }
    const attrs: Record<string, string> = {};
    for (const attrMatch of match[1].matchAll(/([\w-]+)="([^"]*)"/g)) {
      attrs[attrMatch[1]] = attrMatch[2];
    }
    const node = fakeElement('path', attrs);

    applySingleNodeBounds(node as unknown as SVGGraphicsElement, null, END);

    const endSvg = render(sfl(END)).svg;
    const realD = /<path id="sf-frame-f"[^>]*\sd="([^"]*)"/.exec(endSvg)?.[1];
    expect(node.values.d).toBe(realD);
  });
});

describe('a link with no explicit side also matches : it anchors to the edge facing the other entity, not the center', () => {
  const linkSfl = (bx: number, by: number) => `sfl 1.4

Model M {
  Entity a { text: "A"; layout { position: 0, 0; size: 100, 60 } }
  Entity b { text: "B"; layout { position: ${bx}, ${by}; size: 100, 60 } }
  Link l { from: a; to: b }
}
`;

  it('auto-anchored endpoints, entity b dragged to its final bounds', () => {
    const fromBounds = { x: 0, y: 0, width: 100, height: 60 };
    const toBounds = { x: 300, y: 200, width: 100, height: 60 };

    const realD = /<path id="sf-link-l"[^>]*\sd="([^"]*)"/.exec(render(linkSfl(300, 200)).svg)?.[1];

    const routed = routePreviewLink(fromBounds, toBounds, null, null, 'orthogonal');
    const previewD = previewPathData(routed.points, routed.segments, 'orthogonal', 2);

    expect(previewD).toBe(realD);
  });
});
