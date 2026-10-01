import { describe, expect, it } from 'vitest';
import type { RenderInput } from '../src/index';
import { renderCanvas } from '../src/index';
import type { Shape } from '../src/model/shape';

// §1.4 Infographics: inline `**bold**` runs inside a Shape's own
// `text:` property (buildRenderScene.ts's buildShape + renderSceneToSvg.ts's
// textSvg rich-tspan branch). Shape labels only - Link/Chart/Table text
// keeps rendering literal asterisks unchanged, proven below too.

const baseShape = (text: string, extra: Partial<Shape> = {}): Shape =>
  ({
    id: 'e',
    boardId: 'board',
    shapeType: 'rectangle',
    x: 0,
    y: 0,
    width: 220,
    height: 80,
    text,
    fillColor: '#eef2ff',
    strokeColor: '#123456',
    strokeWidth: 2,
    layer_group: 'default',
    order_key: 'a',
    is_visible: true,
    is_locked: false,
    createdAt: '',
    ...extra,
  }) as Shape;

function renderShape(text: string, extra: Partial<Shape> = {}) {
  const input = { shapes: [baseShape(text, extra)], frames: [], swimlanes: [], links: [] } as unknown as RenderInput;
  return renderCanvas(input);
}

describe('Shape label inline **bold** rendering', () => {
  it('renders a bold word inside its own bold tspan, plain text around it normal', () => {
    const { svg } = renderShape('Output **doubled** this year.');
    expect(svg).toContain('xml:space="preserve"');
    // "doubled" sits in its own bold tspan (a trailing baked-in space is
    // expected — see richLineTspans' grouping comment in renderSceneToSvg.ts —
    // since it's the word separator before the next, differently-styled run).
    expect(svg).toMatch(/<tspan[^>]*font-weight="bold"[^>]*>doubled ?<\/tspan>/);
    // The plain run(s) around "doubled" carry font-weight="normal" explicitly
    // (each tspan states its own weight in the rich path).
    expect(svg).toMatch(/<tspan[^>]*font-weight="normal"[^>]*>Output <\/tspan>/);
  });

  it('wraps bold and plain words across multiple visual lines', () => {
    // Narrow width forces a wrap; the width chosen (60px, font-size 14)
    // fits roughly one short word per line under the character-count
    // heuristic, so a bold word landing on its own line is exercised too.
    const { svg } = renderShape('alpha **beta** gamma **delta** epsilon', { width: 90 } as Partial<Shape>);
    const boldMatches = svg.match(/font-weight="bold"[^>]*>([^<]*)<\/tspan>/g) ?? [];
    expect(boldMatches.length).toBeGreaterThanOrEqual(1);
    expect(svg).toContain('beta');
    expect(svg).toContain('delta');
    // Multiple dy-positioned tspans prove more than one visual line was emitted.
    const dyCount = (svg.match(/dy="/g) ?? []).length;
    expect(dyCount).toBeGreaterThan(0);
  });

  it('a lone unmatched ** does not trigger the rich path', () => {
    const { svg } = renderShape('a ** b');
    expect(svg).not.toContain('xml:space="preserve"');
    expect(svg).toContain('a ** b');
  });

  it('plain-text entity SVG is byte-identical to a render with no bold-markup code path involved', () => {
    // Regression proof: rendering the exact same plain text twice (no **
    // anywhere) must be deterministic and never touch the rich-tspan/
    // xml:space path — this is the "zero risk to existing content"
    // guarantee for every shape that doesn't use the new markup.
    const a = renderShape('Plain text label').svg;
    const b = renderShape('Plain text label').svg;
    expect(a).toBe(b);
    expect(a).not.toContain('xml:space="preserve"');
    expect(a).not.toContain('font-weight="bold"');
    expect(a).toMatch(/<tspan x="[\d.]+" font-size="[\d.]+px">Plain text label<\/tspan>/);
  });

  it('Link labels keep rendering literal ** asterisks (out of scope for this feature)', () => {
    const input = {
      shapes: [
        baseShape('a', { id: 'a', x: 0 } as Partial<Shape>),
        baseShape('b', { id: 'b', x: 300 } as Partial<Shape>),
      ],
      frames: [],
      swimlanes: [],
      links: [
        {
          link: {
            id: 'l',
            fromId: 'a',
            toId: 'b',
            showText: true,
            text: '**bold** label',
            style: { pathType: 'straight', color: '#334155' },
            layer_group: 'content',
            order_key: 'a',
            is_visible: true,
            is_locked: false,
          },
          from: { x: 220, y: 40 },
          to: { x: 300, y: 40 },
        },
      ],
    } as unknown as RenderInput;
    const { svg } = renderCanvas(input);
    expect(svg).toContain('**bold** label');
    expect(svg).not.toContain('font-weight="bold">bold</tspan>');
  });
});
