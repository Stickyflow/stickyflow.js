import { describe, expect, it } from 'vitest';
import { render, renderCanvas } from '../src/index';
import type { RenderInput } from '../src/index';

// This whole suite runs under environment: 'node' (see vitest.config.ts). If any
// part of the render core reached for the DOM, Konva or React, it would fail to
// import here — so a green run is itself the headless-portability proof.

describe('render core runs headless through the package (real app source)', () => {
  it('renders every supported shape type as vector content and escapes text', () => {
    const types = [
      'rectangle', 'rounded_rectangle', 'diamond', 'circle', 'oval', 'container_rectangle',
      'cylinder', 'document', 'pill', 'person', 'triangle', 'hexagon', 'parallelogram', 'trapezoid',
    ];
    const input = {
      shapes: types.map((shapeType, index) => ({
        id: String(index), boardId: 'board', shapeType, x: index * 150, y: 20, width: 120, height: 80,
        text: `<${shapeType}>`, fillColor: '#fff', strokeColor: '#123456', strokeWidth: 2,
        layer_group: 'default', order_key: `a${index}`, is_visible: true, is_locked: false, createdAt: '',
      })),
      frames: [], swimlanes: [], links: [],
    } as unknown as RenderInput;

    const { svg, width, height } = renderCanvas(input);

    for (let i = 0; i < types.length; i++) expect(svg).toContain(`sf-shape-${i}`);
    expect(svg).toContain('&lt;rectangle&gt;');
    expect(svg).not.toContain('[object Object]');
    expect(svg).toMatch(/<(rect|ellipse|path) /);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it('renders no fill/stroke (not a default color) when none is set, matching the interactive canvas', () => {
    // The Konva canvas leaves an unset fillColor/strokeColor as `undefined`,
    // painting nothing. Silently substituting SHAPE_DEFAULTS here (as this
    // used to) made an unfilled entity render opaque white in stickyflow.js
    // while the app showed it transparent — e.g. white text became invisible
    // against a fill the entity's own style never actually specified.
    const input = {
      shapes: [{
        id: 'unfilled', boardId: 'board', shapeType: 'pill', x: 0, y: 0, width: 120, height: 60,
        text: 'no fill set', layer_group: 'default', order_key: 'a', is_visible: true, is_locked: false, createdAt: '',
      }],
      frames: [], swimlanes: [], links: [],
    } as unknown as RenderInput;

    const { svg } = renderCanvas(input);

    expect(svg).toMatch(/<rect id="sf-shape-unfilled"[^>]*fill="none"/);
    expect(svg).not.toContain('fill="#ffffff"');
  });

  it('colors a link marker from its gradient stroke instead of a flat gray fallback', () => {
    // Markers can't paint a live gradient reference, so buildRenderScene picks
    // one representative color per end. This used to always fall back to a
    // hardcoded gray whenever the stroke wasn't a plain solid color.
    const link = {
      id: 'grad-link', fromId: 'a', toId: 'b',
      startMarker: 'circle', endMarker: 'arrow',
      style: {
        pathType: 'straight',
        color: { type: 'gradient' as const, angle: 90, stops: [{ position: 0, color: '#61b4c1' }, { position: 100, color: '#030303' }] },
      },
      layer_group: 'default', order_key: 'a', is_visible: true, is_locked: false,
    };
    const input = {
      shapes: [], frames: [], swimlanes: [],
      links: [{ link, from: { x: 0, y: 0 }, to: { x: 200, y: 0 } }],
    } as unknown as RenderInput;

    const { svg } = renderCanvas(input);

    expect(svg).toMatch(/<marker id="sf-marker-circle-0"[^>]*>.*?stroke="#61b4c1"/s);
    expect(svg).toMatch(/<marker id="sf-marker-arrow-1"[^>]*>.*?stroke="#030303"/s);
    expect(svg).not.toContain('#64748b');
  });

  it('exports linear and mesh gradients as vector SVG definitions', () => {
    const gradient = { type: 'gradient' as const, angle: 45, stops: [{ position: 0, color: '#fff' }, { position: 100, color: '#000' }] };
    const base = (id: string, shapeType: string, x: number) => ({
      id, boardId: 'board', shapeType, x, y: 20, width: 120, height: 80,
      strokeColor: '#123456', strokeWidth: 2, layer_group: 'default', order_key: `a${x}`,
      is_visible: true, is_locked: false, createdAt: '',
    });
    const input = {
      shapes: [
        { ...base('gradient', 'rectangle', 0), fillColor: gradient, strokeColor: gradient },
        { ...base('mesh', 'circle', 200), fillColor: { type: 'mesh' as const, points: [
          { id: 'p1', x: 20, y: 30, color: '#e0c3fc' }, { id: 'p2', x: 80, y: 85, color: '#a7e8e0' },
        ] } },
      ],
      frames: [], swimlanes: [], links: [],
    } as unknown as RenderInput;

    const { svg, diagnostics } = renderCanvas(input);

    expect(svg).toContain('<linearGradient');
    expect(svg).toContain('<pattern');
    expect(svg).toContain('<radialGradient');
    expect(svg).toContain('stop-color="#e0c3fc"');
    expect(diagnostics).not.toEqual(expect.arrayContaining([expect.objectContaining({ entityId: 'mesh' })]));
  });

  it('renders link markers and endpoint labels', () => {
    const link = {
      id: 'relation', fromId: 'from', toId: 'to', startMarker: 'triangle', endMarker: 'zero_many',
      style: { pathType: 'straight', color: '#334155', startLabel: '1', endLabel: '0..*' },
      layer_group: 'content', order_key: 'a', is_visible: true, is_locked: false,
    };
    const input = {
      shapes: [], frames: [], swimlanes: [],
      links: [{ link, from: { x: 20, y: 20 }, to: { x: 220, y: 20 } }],
    } as unknown as RenderInput;

    const { svg } = renderCanvas(input);

    expect(svg).toContain('sf-marker-triangle');
    expect(svg).toContain('sf-marker-zero_many');
    expect(svg).toContain('>0..*</tspan>');
  });
});

describe('render(sflSource) — end-to-end SFL text to SVG, headless', () => {
  const SFL = `sfl 1.2

Style Box {
  shape: rounded_rectangle
  fill: "#e0f2fe"
  stroke: "#0369a1"
}

Style Flow {
  route: orthogonal
  stroke: "#0369a1"
  markerEnd: arrow
}

Model Demo {
  text: "Demo"

  Entity start : Box {
    kind: process
    text: "Start"
    layout {
      position: 100, 100
      size: 160, 70
    }
  }

  Entity finish : Box {
    kind: process
    text: "Finish"
    layout {
      position: 100, 300
      size: 160, 70
    }
  }

  Link go : Flow {
    from: start, bottom (0.5)
    to: finish, top (0.5)
    text: "next"
  }
}
`;

  it('parses SFL and produces a real SVG document with both entities', () => {
    const { svg, width, height } = render(SFL);

    expect(svg).toMatch(/^(<\?xml|<svg)/);
    expect(svg).toContain('<svg');
    expect(svg).toContain('sf-shape-start');
    expect(svg).toContain('sf-shape-finish');
    expect(svg).toContain('>Start</tspan>');
    expect(svg).toContain('>Finish</tspan>');
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it('renders the link between the two entities', () => {
    const { svg } = render(SFL);
    expect(svg).toContain('sf-link-go');
  });

  it('lets a link declare an explicit order that overrides its declaration position', () => {
    // "one" is declared first but has the higher order (5), so it must paint
    // last/on top; "two" is declared second but has the lower order (1), so
    // it sorts ahead of "one" and paints underneath. Document order remains
    // the fallback only when no order is set — see SFL spec §13.
    const SFL_ORDER = `sfl 1.2

Model OrderDemo {
  Entity a {
    kind: process
    text: "A"
    layout {
      position: 0, 0
      size: 100, 60
    }
  }

  Entity b {
    kind: process
    text: "B"
    layout {
      position: 300, 0
      size: 100, 60
    }
  }

  Link one {
    from: a, right (0.5)
    to: b, left (0.5)
    order: 5
  }

  Link two {
    from: a, right (0.5)
    to: b, left (0.5)
    order: 1
  }
}
`;
    const { svg } = render(SFL_ORDER);
    const oneIndex = svg.indexOf('sf-link-one');
    const twoIndex = svg.indexOf('sf-link-two');
    expect(oneIndex).toBeGreaterThan(-1);
    expect(twoIndex).toBeGreaterThan(-1);
    expect(twoIndex).toBeLessThan(oneIndex);
  });
});
