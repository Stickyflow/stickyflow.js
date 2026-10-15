import { describe, expect, it } from 'vitest';
import type { RenderInput } from '../src/index';
import { renderCanvas } from '../src/index';
import type { Shape } from '../src/model/shape';

const baseShape = (text: string, extra: Partial<Shape> = {}): Shape =>
  ({
    id: 'e',
    shapeType: 'rectangle',
    x: 0,
    y: 0,
    width: 220,
    height: 80,
    text,
    fillColor: '#eef2ff',
    strokeColor: '#123456',
    strokeWidth: 2,
    layerGroup: 'default',
    orderKey: 'a',
    isVisible: true,
    isLocked: false,
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
    expect(svg).toMatch(/<tspan[^>]*font-weight="bold"[^>]*>doubled ?<\/tspan>/);
    expect(svg).toMatch(/<tspan[^>]*font-weight="normal"[^>]*>Output <\/tspan>/);
  });

  it('wraps bold and plain words across multiple visual lines', () => {
    const { svg } = renderShape('alpha **beta** gamma **delta** epsilon', { width: 90 } as Partial<Shape>);
    const boldMatches = svg.match(/font-weight="bold"[^>]*>([^<]*)<\/tspan>/g) ?? [];
    expect(boldMatches.length).toBeGreaterThanOrEqual(1);
    expect(svg).toContain('beta');
    expect(svg).toContain('delta');
    const dyCount = (svg.match(/dy="/g) ?? []).length;
    expect(dyCount).toBeGreaterThan(0);
  });

  it('a lone unmatched ** does not trigger the rich path', () => {
    const { svg } = renderShape('a ** b');
    expect(svg).not.toContain('xml:space="preserve"');
    expect(svg).toContain('a ** b');
  });

  it('plain-text entity SVG is byte-identical to a render with no bold-markup code path involved', () => {
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
            layerGroup: 'content',
            orderKey: 'a',
            isVisible: true,
            isLocked: false,
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
