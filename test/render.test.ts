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
});
