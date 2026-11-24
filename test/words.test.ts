import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState } from '../src';

const scene = (body: string, before = '') =>
  `sfl 1.12\n\n${before}Model M {\n  Scene world {\n    layout {\n      position: 0, 0\n      size: 400, 300\n    }\n${body}  }\n}\n`;

const objectOf = (source: string, id: string) =>
  sflToCanvasState(source).canvasObjects.find(object => object.id === id);
const codes = (source: string) => render(source).diagnostics.map(found => found.code);
const solid = (edges: string) =>
  scene(`    Solid box {\n${edges}      layout {\n        size: 1, 1, 1\n      }\n    }\n`);

describe('The words of the edges', () => {
  it('round all edges of the top and the bottom with fillet, as chamfer with edge: round did', () => {
    const now = solid('      fillet: 0.1\n');
    const before = solid('      chamfer: 0.1\n      edge: round\n');
    expect(objectOf(now, 'box')?.mesh?.asset).toEqual(objectOf(before, 'box')?.mesh?.asset);
    expect(codes(now)).toEqual([]);
    expect(codes(before)).toEqual(['edge-word-before']);
  });

  it('name single edges with chamferEdges, filletTop and the rest, as cut and roundTop did', () => {
    const now = solid('      chamferEdges: [[0, 1, 0.1]]\n      filletTop: [[0, 2, 0.05]]\n');
    const before = solid('      cut: [[0, 1, 0.1]]\n      roundTop: [[0, 2, 0.05]]\n');
    expect(objectOf(now, 'box')?.mesh?.asset).toEqual(objectOf(before, 'box')?.mesh?.asset);
    expect(codes(now)).toEqual([]);
    expect(codes(before)).toEqual(['edge-word-before']);
  });
});

describe('A Light and a Ground', () => {
  it('take how high a light stands as elevation, as height did', () => {
    const now = scene('    Light sun {\n      turn: 140\n      elevation: 55\n    }\n');
    const before = scene('    Light sun {\n      turn: 140\n      height: 55\n    }\n');
    expect(objectOf(now, 'sun')?.meshLight).toEqual(objectOf(before, 'sun')?.meshLight);
    expect(objectOf(now, 'sun')?.meshLight).toMatchObject({ turn: 140, height: 55 });
    expect(codes(now)).toEqual([]);
    expect(codes(before)).toEqual(['light-height']);
  });

  it('take where a Ground lies from its layout, as height did', () => {
    const now = scene('    Ground floor {\n      layout {\n        position: 0, -0.3, 0\n      }\n    }\n');
    const before = scene('    Ground floor {\n      height: -0.3\n    }\n');
    expect(objectOf(now, 'floor')?.meshGround?.height).toEqual(-0.3);
    expect(objectOf(before, 'floor')?.meshGround?.height).toEqual(-0.3);
    expect(codes(now)).toEqual([]);
    expect(codes(before)).toEqual(['ground-height']);
  });
});

describe('A Shape drawn as a Symbol', () => {
  const symbol = 'Symbol Tag {\n  points: [[0, 0], [1, 0], [0.5, 1]]\n}\n\n';
  const shape = (named: string) =>
    `sfl 1.12\n\n${symbol}Model M {\n  Shape tag {\n    ${named}\n    text: ""\n    layout {\n      position: 0, 0\n      size: 40, 40\n    }\n  }\n}\n`;

  it('names it in symbol, as shape did', () => {
    expect(objectOf(shape('symbol: Tag'), 'tag')).toMatchObject({ shapeType: 'symbol' });
    expect(objectOf(shape('shape: Tag'), 'tag')).toMatchObject({ shapeType: 'symbol' });
    expect(codes(shape('symbol: Tag'))).toEqual([]);
    expect(codes(shape('shape: Tag'))).toEqual(['shape-names-symbol']);
  });
});

describe('A Repeat as written', () => {
  const repeat = (own: string, position: string, inScene: boolean) => {
    const body = `    Repeat row {\n      count: 3\n      step: 1\n${own}      Shape s {\n        text: ""\n        layout {\n          position: ${position}\n          size: 1, 1\n        }\n      }\n    }\n`;
    return inScene ? scene(body) : `sfl 1.12\n\nModel M {\n${body}}\n`;
  };

  it('takes sequence, as order did, with a word about order', () => {
    expect(codes(repeat('      sequence: diagonal\n', 'x, y', false))).toEqual([]);
    expect(codes(repeat('      order: diagonal\n', 'x, y', false))).toEqual(['repeat-order']);
  });

  it('says that its rows are named z in a Scene', () => {
    expect(codes(repeat('', 'x, y', true))).toContain('repeat-y-in-scene');
    expect(codes(repeat('', 'x, z', true))).not.toContain('repeat-y-in-scene');
    expect(codes(repeat('', 'x, y', false))).not.toContain('repeat-y-in-scene');
  });
});
