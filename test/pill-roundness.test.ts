import { describe, expect, it } from 'vitest';
import { render } from '../src/index';
import { applySingleNodeBounds } from '../src/interaction/resize/geometryPreview';

const SIZES: Array<[number, number]> = [
  [200, 80],
  [80, 200],
  [100, 100],
  [300, 20],
  [20, 300],
  [37.5, 12.25],
  [12.25, 37.5],
  [10, 10],
];

function pillSfl(width: number, height: number): string {
  return `sfl 1.4

Model M {
  Shape e {
    style { shape: pill }
    layout { position: 0, 0; size: ${width}, ${height} }
  }
}
`;
}

function rectAttrs(svg: string): Record<string, string> {
  const tag = /<rect id="sf-shape-e"([^>]*)\/?>/.exec(svg)?.[1] ?? '';
  return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
}

function fakeRect(attrs: Record<string, string>) {
  const values = { ...attrs };
  return {
    tagName: 'rect',
    getAttribute: (name: string) => values[name] ?? null,
    hasAttribute: (name: string) => name in values,
    setAttribute: (name: string, value: string) => {
      values[name] = value;
    },
    values,
  };
}

describe('a pill keeps perfectly round end caps at every size', () => {
  it.each(SIZES)('renders %s x %s with caps of exactly half the short side', (width, height) => {
    const attrs = rectAttrs(render(pillSfl(width, height)).svg);
    expect(Number(attrs.rx)).toBeCloseTo(Math.min(width, height) / 2, 3);
    expect(Number(attrs.width)).toBeCloseTo(width, 3);
    expect(Number(attrs.height)).toBeCloseTo(height, 3);
  });

  it.each(SIZES)(
    'a live drag from any other size lands on the same radius as a real render at %s x %s',
    (width, height) => {
      for (const [startWidth, startHeight] of SIZES) {
        const node = fakeRect(rectAttrs(render(pillSfl(startWidth, startHeight)).svg));
        applySingleNodeBounds(node as unknown as SVGGraphicsElement, 'pill', { x: 0, y: 0, width, height });
        const real = rectAttrs(render(pillSfl(width, height)).svg);
        expect(Number(node.values.rx)).toBeCloseTo(Number(real.rx), 3);
        expect(node.values.ry).toBeUndefined();
      }
    },
  );
});

describe('a double-stroked pill keeps its inner ring inset and round while it is dragged', () => {
  it('previews every ring at the same radius a real render lands on', async () => {
    const { applyResizePreview } = await import('../src/interaction/resize/preview');
    const { insetWithin } = await import('../src/interaction/resize/geometry');
    const doubleSfl = (width: number, height: number) => `sfl 1.4

Model M {
  Shape e {
    style { shape: pill; strokeStyle: double; strokeWidth: 3 }
    layout { position: 0, 0; size: ${width}, ${height} }
  }
}
`;
    const ringsOf = (svg: string) =>
      [...svg.matchAll(/<rect id="(sf-shape-e[^"]*)"([^>]*)\/?>/g)].map(match => ({
        id: match[1],
        attrs: Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(pair => [pair[1], pair[2]])),
      }));
    const start = ringsOf(render(doubleSfl(200, 80)).svg);
    const nodes = start.map(ring => fakeRect(ring.attrs));
    const outer = { x: 0, y: 0, width: 200, height: 80 };
    const insets = nodes.map(node =>
      insetWithin(outer, {
        x: Number(node.values.x),
        y: Number(node.values.y),
        width: Number(node.values.width),
        height: Number(node.values.height),
      }),
    );
    const end = { x: 0, y: 0, width: 260, height: 30 };
    applyResizePreview(
      {
        geometryNodes: nodes as unknown as SVGGraphicsElement[],
        insets,
        kind: 'pill',
        isComposite: false,
        overlay: null,
        bubbles: null,
        liveLinks: [],
        text: null,
      } as unknown as Parameters<typeof applyResizePreview>[0],
      end,
    );
    const real = ringsOf(render(doubleSfl(260, 30)).svg);
    nodes.forEach((node, index) => {
      for (const key of ['x', 'y', 'width', 'height', 'rx']) {
        expect(Number(node.values[key])).toBeCloseTo(Number(real[index].attrs[key]), 3);
      }
    });
  });
});
