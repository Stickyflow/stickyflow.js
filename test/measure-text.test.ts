import { describe, expect, it } from 'vitest';
import type { MeasureTextFactory, RenderInput } from '../src/index';
import { renderCanvas } from '../src/index';
import type { Shape } from '../src/model/shape';
import { wrapText } from '../src/model/text';

// RenderOptions.measureText: the opt-in escape hatch from this package's
// character-count wrap estimate to real glyph metrics supplied by the host
// (stickyflow-atlas passes its canvas measurer; Node keeps the heuristic so
// output stays reproducible). The contract these tests pin:
//   - omitted  -> byte-identical to before (golden.test.ts covers that too)
//   - supplied -> called once per text node with that node's RESOLVED font,
//                 and its widths actually drive where lines break
// Everything downstream of the wrap (label height -> link label gap) follows
// from those, so getting the resolved font wrong is the failure that matters.

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

function renderShape(text: string, extra: Partial<Shape> = {}, measureText?: MeasureTextFactory) {
  const input = { shapes: [baseShape(text, extra)], frames: [], swimlanes: [], links: [] } as unknown as RenderInput;
  return renderCanvas(input, { measureText });
}

/** Records every (fontFamily, fontSize) the renderer asks about, and reports a
 *  fixed width per character so a test can predict breaks exactly. */
function spyMeasurer(pxPerChar: number, boldPxPerChar = pxPerChar) {
  const calls: Array<{ fontFamily: string; fontSize: number }> = [];
  const factory: MeasureTextFactory = (fontFamily, fontSize) => {
    calls.push({ fontFamily, fontSize });
    return {
      measure: (text, bold) => text.length * (bold ? boldPxPerChar : pxPerChar),
      spaceWidth: pxPerChar,
    };
  };
  return { factory, calls };
}

const tspans = (svg: string): string[] => [...svg.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map(match => match[1]);

describe('wrapText — measured vs heuristic', () => {
  it('without metrics, wraps by character count exactly as before', () => {
    // width 100 / (fontSize 10 * .58) => 17 chars per line
    expect(wrapText('aaaa bbbb cccc dddd', 100, 10)).toEqual(['aaaa bbbb cccc', 'dddd']);
  });

  it('with metrics, wraps by measured width instead', () => {
    // 20px per char is far wider than the .58*10 = 5.8px the heuristic assumes,
    // so the same string breaks much earlier.
    const metrics = { measure: (text: string) => text.length * 20, spaceWidth: 20 };
    expect(wrapText('aaaa bbbb cccc dddd', 100, 10, metrics)).toEqual(['aaaa', 'bbbb', 'cccc', 'dddd']);
  });

  it('narrower glyphs than the heuristic assumes let more fit on a line', () => {
    const metrics = { measure: (text: string) => text.length * 1, spaceWidth: 1 };
    expect(wrapText('aaaa bbbb cccc dddd', 100, 10, metrics)).toEqual(['aaaa bbbb cccc dddd']);
  });

  it('never drops an explicit newline, measured or not', () => {
    const metrics = { measure: (text: string) => text.length * 50, spaceWidth: 50 };
    expect(wrapText('a\nb', 100, 10, metrics)).toEqual(['a', 'b']);
    expect(wrapText('a\nb', 100, 10)).toEqual(['a', 'b']);
  });
});

describe('RenderOptions.measureText', () => {
  it('is not called at all when omitted', () => {
    const { calls } = spyMeasurer(10);
    renderShape('some label text here');
    expect(calls).toEqual([]);
  });

  it('leaves output identical to the heuristic when omitted', () => {
    const a = renderShape('one two three four five six seven').svg;
    const b = renderShape('one two three four five six seven').svg;
    expect(a).toBe(b);
  });

  it('changes where a shape label breaks', () => {
    const text = 'one two three four five six';
    const plain = renderShape(text);
    const { factory } = spyMeasurer(30);
    const measured = renderShape(text, {}, factory);
    expect(tspans(measured.svg)).not.toEqual(tspans(plain.svg));
    // 30px/char against a 220-wide shape minus 2*8 padding = 204 usable:
    // every word lands on its own line.
    expect(tspans(measured.svg)).toEqual(['one', 'two', 'three', 'four', 'five', 'six']);
  });

  it("receives the shape's resolved font family and size", () => {
    const { factory, calls } = spyMeasurer(5);
    renderShape('hello', { fontFamily: 'Georgia, serif', fontSize: 21 }, factory);
    expect(calls).toEqual([{ fontFamily: 'Georgia, serif', fontSize: 21 }]);
  });

  it('receives the default font family when the shape declares none', () => {
    const { factory, calls } = spyMeasurer(5);
    renderShape('hello', {}, factory);
    expect(calls).toHaveLength(1);
    expect(calls[0].fontFamily).toContain('Inter');
  });

  it('drives the rich (bold-markup) wrap too, not just the plain one', () => {
    // A bold-heavy measurer must push the bold run onto its own line — proving
    // wrapRichText got these metrics rather than falling back to the heuristic.
    const { factory, calls } = spyMeasurer(2, 60);
    const { svg } = renderShape('aa **bold** cc', {}, factory);
    expect(calls).toHaveLength(1);
    expect(svg).toMatch(/font-weight="bold"/);
    const lines = tspans(svg);
    expect(lines.some(line => line.includes('bold'))).toBe(true);
    expect(lines.find(line => line.includes('bold'))).not.toContain('aa');
  });
});

describe('RenderOptions.measureText — link labels', () => {
  const linkInput = (fontFamily?: string): RenderInput =>
    ({
      shapes: [baseShape('A', { id: 'a', x: 0, y: 0 }), baseShape('B', { id: 'b', x: 0, y: 300 })],
      frames: [],
      swimlanes: [],
      links: [
        {
          link: {
            id: 'l',
            fromId: 'a',
            toId: 'b',
            text: 'alpha beta gamma',
            showText: true,
            pathType: 'straight',
            style: fontFamily ? { fontFamily, fontSize: 10 } : { fontSize: 10 },
          },
          from: { x: 110, y: 80 },
          to: { x: 110, y: 300 },
        },
      ],
    }) as unknown as RenderInput;

  it("is called with the link style's own font family", () => {
    const { factory, calls } = spyMeasurer(4);
    renderCanvas(linkInput('Courier New, monospace'), { measureText: factory });
    expect(calls).toContainEqual({ fontFamily: 'Courier New, monospace', fontSize: 10 });
  });

  it('changes where a link label breaks', () => {
    const plain = renderCanvas(linkInput()).svg;
    const { factory } = spyMeasurer(40);
    const measured = renderCanvas(linkInput(), { measureText: factory }).svg;
    expect(tspans(measured)).not.toEqual(tspans(plain));
  });
});
