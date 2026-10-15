import { describe, expect, it } from 'vitest';
import type { RenderInput } from '../src/index';
import { render, renderCanvas, sflToCanvasState } from '../src/index';

describe('render core runs headless through the package (real app source)', () => {
  it('does not render a shape whose canonical visibility flag is false', () => {
    const input = {
      shapes: [
        {
          id: 'hidden',
          shapeType: 'rectangle',
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          isVisible: false,
        },
      ],
      frames: [],
      swimlanes: [],
      links: [],
    } as unknown as RenderInput;

    expect(renderCanvas(input).svg).not.toContain('sf-shape-hidden');
  });

  it('renders every supported shape type as vector content and escapes text', () => {
    const types = [
      'rectangle',
      'rounded_rectangle',
      'diamond',
      'oval',
      'cylinder',
      'document',
      'pill',
      'person',
      'triangle',
      'hexagon',
      'parallelogram',
      'trapezoid',
      'note',
      'cloud',
      'predefined_process',
    ];
    const input = {
      shapes: types.map((shapeType, index) => ({
        id: String(index),
        shapeType,
        x: index * 150,
        y: 20,
        width: 120,
        height: 80,
        text: `<${shapeType}>`,
        fillColor: '#fff',
        strokeColor: '#123456',
        strokeWidth: 2,
        layerGroup: 'default',
        orderKey: `a${index}`,
        isVisible: true,
        isLocked: false,
      })),
      frames: [],
      swimlanes: [],
      links: [],
    } as unknown as RenderInput;

    const { svg, width, height } = renderCanvas(input);

    for (let i = 0; i < types.length; i++) {
      expect(svg).toContain(`sf-shape-${i}`);
    }
    expect(svg).toContain('&lt;rectangle&gt;');
    expect(svg).not.toContain('[object Object]');
    expect(svg).toMatch(/<(rect|ellipse|path) /);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it('falls back to rectangle defaults instead of crashing on an unrecognized shapeType', () => {
    const input = {
      shapes: [
        {
          id: 'mystery',
          shapeType: 'not_a_real_shape',
          x: 0,
          y: 0,
          width: 120,
          height: 60,
          text: 'unknown shape',
          layerGroup: 'default',
          orderKey: 'a',
          isVisible: true,
          isLocked: false,
        },
      ],
      frames: [],
      swimlanes: [],
      links: [],
    } as unknown as RenderInput;

    expect(() => renderCanvas(input)).not.toThrow();
    const { svg, diagnostics } = renderCanvas(input);
    expect(svg).toMatch(/<rect id="sf-shape-mystery"/);
    expect(diagnostics?.some(d => d.code === 'unknown-shape-type' && d.ownerId === 'mystery')).toBe(true);
  });

  it('renders no fill/stroke (not a default color) when none is set, matching the interactive canvas', () => {
    const input = {
      shapes: [
        {
          id: 'unfilled',
          shapeType: 'pill',
          x: 0,
          y: 0,
          width: 120,
          height: 60,
          text: 'no fill set',
          layerGroup: 'default',
          orderKey: 'a',
          isVisible: true,
          isLocked: false,
        },
      ],
      frames: [],
      swimlanes: [],
      links: [],
    } as unknown as RenderInput;

    const { svg } = renderCanvas(input);

    expect(svg).toMatch(/<rect id="sf-shape-unfilled"[^>]*fill="none"/);
    expect(svg).not.toContain('fill="#ffffff"');
  });

  it('colors a link marker from its gradient stroke instead of a flat gray fallback', () => {
    const link = {
      id: 'grad-link',
      fromId: 'a',
      toId: 'b',
      startMarker: 'circle',
      endMarker: 'arrow',
      style: {
        pathType: 'straight',
        color: {
          type: 'gradient' as const,
          angle: 90,
          stops: [
            { position: 0, color: '#61b4c1' },
            { position: 100, color: '#030303' },
          ],
        },
      },
      layerGroup: 'default',
      orderKey: 'a',
      isVisible: true,
      isLocked: false,
    };
    const input = {
      shapes: [],
      frames: [],
      swimlanes: [],
      links: [{ link, from: { x: 0, y: 0 }, to: { x: 200, y: 0 } }],
    } as unknown as RenderInput;

    const { svg } = renderCanvas(input);

    expect(svg).toMatch(/<marker id="sf-marker-circle-0"[^>]*>.*?stroke="#61b4c1"/s);
    expect(svg).toMatch(/<marker id="sf-marker-arrow-1"[^>]*>.*?stroke="#030303"/s);
    expect(svg).not.toContain('#64748b');
  });

  it('exports linear and mesh gradients as vector SVG definitions', () => {
    const gradient = {
      type: 'gradient' as const,
      angle: 45,
      stops: [
        { position: 0, color: '#fff' },
        { position: 100, color: '#000' },
      ],
    };
    const base = (id: string, shapeType: string, x: number) => ({
      id,
      shapeType,
      x,
      y: 20,
      width: 120,
      height: 80,
      strokeColor: '#123456',
      strokeWidth: 2,
      layerGroup: 'default',
      orderKey: `a${x}`,
      isVisible: true,
      isLocked: false,
    });
    const input = {
      shapes: [
        { ...base('gradient', 'rectangle', 0), fillColor: gradient, strokeColor: gradient },
        {
          ...base('mesh', 'oval', 200),
          fillColor: {
            type: 'mesh' as const,
            points: [
              { id: 'p1', x: 20, y: 30, color: '#e0c3fc' },
              { id: 'p2', x: 80, y: 85, color: '#a7e8e0' },
            ],
          },
        },
      ],
      frames: [],
      swimlanes: [],
      links: [],
    } as unknown as RenderInput;

    const { svg, diagnostics } = renderCanvas(input);

    expect(svg).toContain('<linearGradient');
    expect(svg).toContain('<pattern');
    expect(svg).toContain('<radialGradient');
    expect(svg).toContain('stop-color="#e0c3fc"');
    expect(diagnostics).not.toEqual(expect.arrayContaining([expect.objectContaining({ ownerId: 'mesh' })]));
  });

  it('renders link markers and endpoint labels', () => {
    const link = {
      id: 'relation',
      fromId: 'from',
      toId: 'to',
      startMarker: 'triangle',
      endMarker: 'zero_many',
      style: { pathType: 'straight', color: '#334155', startLabel: '1', endLabel: '0..*' },
      layerGroup: 'content',
      orderKey: 'a',
      isVisible: true,
      isLocked: false,
    };
    const input = {
      shapes: [],
      frames: [],
      swimlanes: [],
      links: [{ link, from: { x: 20, y: 20 }, to: { x: 220, y: 20 } }],
    } as unknown as RenderInput;

    const { svg } = renderCanvas(input);

    expect(svg).toContain('sf-marker-triangle');
    expect(svg).toContain('sf-marker-zero_many');
    expect(svg).toContain('>0..*</tspan>');
  });

  it("cuts a real gap in a link's stroke where its text label sits, instead of drawing the label on top of an unbroken line", () => {
    const link = {
      id: 'labeled',
      fromId: 'from',
      toId: 'to',
      text: 'HTTP Request',
      showText: true,
      style: { pathType: 'straight', color: '#334155' },
      layerGroup: 'content',
      orderKey: 'a',
      isVisible: true,
      isLocked: false,
    };
    const input = {
      shapes: [],
      frames: [],
      swimlanes: [],
      links: [{ link, from: { x: 0, y: 0 }, to: { x: 400, y: 0 } }],
    } as unknown as RenderInput;

    const { svg } = renderCanvas(input);

    expect(svg).toContain('data-sf-label-gap="true"');
    const dasharray = svg.match(/id="sf-link-labeled"[^>]*stroke-dasharray="([^"]+)"/)?.[1];
    if (!dasharray) {
      throw new Error('Label gap dash pattern is missing from the rendered link.');
    }
    const [dashBefore, gapLength] = dasharray.split(' ').map(Number);
    expect(dashBefore).toBeGreaterThan(0);
    expect(gapLength).toBeGreaterThan(0);
    expect(svg).toContain('d="M 0 0 L 400 0"');
  });

  it("leaves a dashed link's own stroke pattern alone when it has a text label, rather than overwriting it with a label gap", () => {
    const link = {
      id: 'dashedLabeled',
      fromId: 'from',
      toId: 'to',
      text: 'retry',
      showText: true,
      style: { pathType: 'straight', color: '#334155', strokeStyle: 'dashed' },
      layerGroup: 'content',
      orderKey: 'a',
      isVisible: true,
      isLocked: false,
    };
    const input = {
      shapes: [],
      frames: [],
      swimlanes: [],
      links: [{ link, from: { x: 0, y: 0 }, to: { x: 400, y: 0 } }],
    } as unknown as RenderInput;

    const { svg } = renderCanvas(input);

    expect(svg).not.toContain('data-sf-label-gap');
    expect(svg).toMatch(/id="sf-link-dashedLabeled"[^>]*stroke-dasharray="16 8"/);
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

  Shape start : Box {
    kind: process
    text: "Start"
    layout {
      position: 100, 100
      size: 160, 70
    }
  }

  Shape finish : Box {
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

  it('renders the link between the two entities, including its text label', () => {
    const { svg } = render(SFL);
    expect(svg).toContain('sf-link-go');
    expect(svg).toContain('>next</tspan>');
  });

  it('gives a finite scene height when a link endpoint omits its fraction (spec §10: optional, defaults to 0.5)', () => {
    const withoutFraction = `sfl 1.2

Model m {
  Shape a { text: "A"
    layout { position: 60, 60
      size: 160, 70 } }
  Shape b { text: "B"
    layout { position: 500, 60
      size: 160, 70 } }
  Link l1 { from: a, right
    to: b, left }
}
`;
    const { height, width, diagnostics } = render(withoutFraction);
    expect(Number.isFinite(height)).toBe(true);
    expect(Number.isFinite(width)).toBe(true);
    expect(diagnostics).toEqual([]);
  });

  it('renders `kind: note` as an ordinary shape instead of silently dropping it', () => {
    const withNote = `sfl 1.2

Model m {
  Shape a {
    kind: note
    text: "LB concern"
    layout { position: 0, 0
      size: 190, 72 }
    style { shape: rounded_rectangle }
  }
}
`;
    const state = sflToCanvasState(withNote);
    expect(state.canvasObjects.map(e => e.id)).toEqual(['a']);
    expect(state.canvasObjects[0].objectType).toBe('shape');
    expect(state.canvasObjects[0].kind).toBe('note');

    const { svg, diagnostics } = render(withNote);
    expect(diagnostics).toEqual([]);
    expect(svg).toContain('data-sf-id="a"');
    expect(svg).toContain('LB concern');
  });

  it('reports a diagnostic for a Style declared inside Model instead of at the top level', () => {
    const stylesInsideModel = `sfl 1.2

Model m {
  Style LivingRoom {
    shape: rectangle
    fill: "#e0f2fe"
    stroke: "#0284c7"
  }

  Shape living : LivingRoom {
    text: "Living room"
    layout { position: 80, 100
      size: 360, 270 }
  }
}
`;
    const state = sflToCanvasState(stylesInsideModel);
    expect(state.canvasObjects[0].shapeType).toBeUndefined();
    expect(state.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'warning', code: 'unresolved-style-or-layout', ownerId: 'living' }),
      ]),
    );

    const { diagnostics, svg } = render(stylesInsideModel);
    expect(diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'unresolved-style-or-layout', ownerId: 'living' })]),
    );
    expect(svg).toMatch(/data-sf-id="living"[^>]*fill="none"/);
  });

  it('reports no diagnostic once the same Style is moved to the top level, where it belongs', () => {
    const stylesAtTopLevel = `sfl 1.2

Style LivingRoom {
  shape: rectangle
  fill: "#e0f2fe"
  stroke: "#0284c7"
}

Model m {
  Shape living : LivingRoom {
    text: "Living room"
    layout { position: 80, 100
      size: 360, 270 }
  }
}
`;
    const state = sflToCanvasState(stylesAtTopLevel);
    expect(state.canvasObjects[0].shapeType).toBe('rectangle');
    expect(state.diagnostics).toEqual([]);

    const { diagnostics, svg } = render(stylesAtTopLevel);
    expect(diagnostics).toEqual([]);
    expect(svg).toMatch(/data-sf-id="living"[^>]*fill="#e0f2fe"/);
  });

  it("bends an orthogonal link per its `segments:` offsets instead of always using the router's default route", () => {
    const linkSfl = (segments?: string) => `sfl 1.2

Model M {
  Shape a {
    layout { position: 0, 0; size: 100, 60 }
  }
  Shape b {
    layout { position: 300, 150; size: 100, 60 }
  }
  Link go {
    from: a, right (0.5)
    to: b, left (0.5)
    route: orthogonal
${segments ? `    segments: ${segments}\n` : ''}  }
}
`;
    const linkPath = (svg: string) => svg.match(/<path id="sf-link-go"[^>]*\sd="([^"]+)"/)?.[1];
    const baselineD = linkPath(render(linkSfl()).svg);
    expect(baselineD).toBeTruthy();

    const bentD = linkPath(render(linkSfl('[0, 0, 60, 0]')).svg);
    expect(bentD).toBeTruthy();
    expect(bentD).not.toBe(baselineD);
  });

  it('lets a link opt out of its text label with showText: false', () => {
    const SFL_HIDDEN = SFL.replace('text: "next"', 'text: "next"\n    showText: false');
    const { svg } = render(SFL_HIDDEN);
    expect(svg).not.toContain('>next</tspan>');
  });

  it('keeps ids byte-identical with no idPrefix (golden-snapshot compatibility)', () => {
    const withoutOption = render(SFL).svg;
    const withEmptyOptions = render(SFL, {}).svg;
    expect(withEmptyOptions).toBe(withoutOption);
    expect(withoutOption).toContain('id="sf-shape-start"');
  });

  it('keeps two renders with distinct idPrefix from colliding when embedded on the same page', () => {
    const oneShape = (fill: string) => `sfl 1.2

Model M {
  Shape e {
    text: ""
    style {
      shape: rounded_rectangle
      fill: "${fill}"
      stroke: none
    }
    layout {
      position: 0, 0
      size: 100, 60
    }
  }
}
`;
    const a = render(oneShape('gradient(0, #ef4444 0%, #3b82f6 100%)'), { idPrefix: 'diagram-a' });
    const b = render(oneShape('gradient(0, #22c55e 0%, #eab308 100%)'), { idPrefix: 'diagram-b' });

    expect(a.svg).toContain('id="sf-diagram-a-shape-e"');
    expect(b.svg).toContain('id="sf-diagram-b-shape-e"');
    const gradientIdIn = (svg: string, prefix: string) =>
      svg.match(new RegExp(`<linearGradient id="(${prefix}[^"]+)"`))?.[1];
    const idA = gradientIdIn(a.svg, 'sf-diagram-a-');
    const idB = gradientIdIn(b.svg, 'sf-diagram-b-');
    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(idA).not.toBe(idB);
    expect(a.svg).toContain('data-sf-id="e"');
    expect(b.svg).toContain('data-sf-id="e"');
  });

  it('applies a gradient stroke and opacity declared on a shape via SFL', () => {
    const SFL_SHAPE = `sfl 1.2

Model M {
  Shape e {
    text: "x"
    style {
      shape: rounded_rectangle
      fill: "#6366f1"
      stroke: "gradient(90, #61b4c1 0%, #030303 100%)"
      opacity: 0.5
    }
    layout {
      position: 0, 0
      size: 160, 90
    }
  }
}
`;
    const { svg } = render(SFL_SHAPE);
    expect(svg).toContain('<linearGradient');
    expect(svg).toMatch(/opacity="0\.5"/);
  });

  it('renders a swimlane with real lanes from SFL text instead of collapsing it to a frame', () => {
    const SFL_SWIMLANE = `sfl 1.2

Model LaneDemo {
  Container process {
    kind: swimlane
    text: "Order process"
    orientation: horizontal
    lanes: [["Customer", 120], ["Warehouse", 120]]
    layout {
      position: 0, 0
      size: 400, 240
    }
  }
}
`;
    const { svg } = render(SFL_SWIMLANE);
    expect(svg).toContain('sf-swimlane-process');
    expect(svg).toContain('swimlane-divider-process');
    expect(svg).toContain('>Customer</tspan>');
    expect(svg).toContain('>Warehouse</tspan>');
    expect(svg).not.toContain('sf-frame-process');
  });

  it('never draws a title tab for a swimlane (matches the real canvas app, unlike a frame)', () => {
    const SFL_SWIMLANE_TITLE = `sfl 1.2

Model M {
  Container process {
    kind: swimlane
    text: "Order Process"
    orientation: horizontal
    lanes: [["Customer", 100], ["Warehouse", 100]]
    layout {
      position: 0, 0
      size: 400, 240
    }
  }
}
`;
    const { svg } = render(SFL_SWIMLANE_TITLE);
    expect(svg).not.toContain('sf-swimlane-tab-process');
    expect(svg).not.toContain('>Order Process</tspan>');
  });

  it('rotates lane labels -90° for horizontal orientation, reading bottom-to-top like the real canvas app', () => {
    const demo = (orientation: 'horizontal' | 'vertical') => `sfl 1.2

Model M {
  Container p {
    kind: swimlane
    orientation: ${orientation}
    lanes: [["Customer", 100], ["Warehouse", 100]]
    layout {
      position: 0, 0
      size: 400, 240
    }
  }
}
`;
    const horizontal = render(demo('horizontal')).svg;
    const vertical = render(demo('vertical')).svg;
    expect(horizontal).toMatch(/<text id="sf-swimlane-label-p-lane-1"[^>]*transform="rotate\(-90/);
    expect(vertical).not.toContain('rotate(-90');
    expect(horizontal).toContain('>Customer</tspan>');
    expect(vertical).toContain('>Customer</tspan>');
  });

  it("scales lane sizes to fit when they do not sum to the swimlane's own declared height", () => {
    const SFL_MISMATCHED = `sfl 1.2

Model M {
  Container p {
    kind: swimlane
    orientation: horizontal
    lanes: [["Customer", 130], ["Warehouse", 130]]
    layout {
      position: 0, 0
      size: 400, 160
    }
  }
}
`;
    const { svg } = render(SFL_MISMATCHED);
    const divider = svg.match(/<path id="sf-swimlane-divider-p-0"[^>]*d="M 0 ([\d.]+) H/);
    expect(Number(divider?.[1])).toBeCloseTo(80, 0);
    expect(svg).toContain('>Customer</tspan>');
    expect(svg).toContain('>Warehouse</tspan>');
  });

  it('renders a frame title tab without crashing when no fontSize is set, and lets showLabel hide it', () => {
    const frameDoc = (extra: string) => `sfl 1.2

Model M {
  Container f {
    kind: frame
    text: "Checkout Flow"
    fill: "#f5f3ff"
    stroke: "#9b42df"
${extra}
    layout {
      position: 0, 0
      size: 300, 200
    }
  }
}
`;
    const shown = render(frameDoc(''));
    expect(shown.svg).toContain('sf-frame-tab-f');
    expect(shown.svg).toContain('>Checkout Flow</tspan>');

    const hidden = render(frameDoc('    showLabel: false'));
    expect(hidden.svg).not.toContain('sf-frame-tab-f');
  });

  it('lets a link declare an explicit order that overrides its declaration position', () => {
    const SFL_ORDER = `sfl 1.2

Model OrderDemo {
  Shape a {
    kind: process
    text: "A"
    layout {
      position: 0, 0
      size: 100, 60
    }
  }

  Shape b {
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
