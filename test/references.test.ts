import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState } from '../src';

const scene = (body: string, before = '') =>
  `sfl 1.12\n\n${before}Model M {\n  Scene world {\n    layout {\n      position: 0, 0\n      size: 400, 300\n    }\n${body}  }\n}\n`;

const DESK = `Template desk {
  Sketch plan {
    Rect top {
      at: 0, 0
      size: 1.6, 0.8
    }
  }
  Solid board {
    sketch: plan
    height: 0.03
  }
}

`;

const meshOf = (source: string, id: string) =>
  sflToCanvasState(source).canvasObjects.find(object => object.id === id)?.mesh;
const assetOf = (source: string, id: string) => meshOf(source, id)?.asset ?? '';

describe('A reference inside a copy', () => {
  it('points at the block of the same copy of a Template', () => {
    const source = scene('    Use d1 : desk {\n    }\n    Use d2 : desk {\n    }\n', DESK);
    const { diagnostics } = render(source);
    expect(diagnostics.filter(found => found.code === 'unknown-reference')).toEqual([]);
    const plain = scene('    Solid cube {\n    }\n');
    expect(assetOf(source, 'd1_board')).not.toEqual(assetOf(plain, 'cube'));
    expect(assetOf(source, 'd1_board')).toEqual(assetOf(source, 'd2_board'));
  });

  it('points at the block of the same cell of a Repeat, and leaves a name outside the copy as it is', () => {
    const source = scene(
      `    Sketch shared {\n      Rect r {\n        at: 0, 0\n        size: 1, 1\n      }\n    }\n    Repeat row {\n      count: 2\n      step: 2\n      Sketch own {\n        Rect r {\n          at: x, 0\n          size: 1, 1\n        }\n      }\n      Solid mine {\n        sketch: own\n        height: 0.1\n      }\n      Solid theirs {\n        sketch: shared\n        height: 0.1\n      }\n    }\n`,
    );
    const { diagnostics } = render(source);
    expect(diagnostics.filter(found => found.code === 'unknown-reference')).toEqual([]);
    expect(meshOf(source, 'mine_0')?.position).not.toEqual(meshOf(source, 'mine_1')?.position);
    expect(meshOf(source, 'theirs_0')?.position).toEqual(meshOf(source, 'theirs_1')?.position);
  });
});

describe('A name that points at nothing', () => {
  it('is said for a Sketch, a Symbol, an anchor and a picture', () => {
    const source = scene(
      '    Solid a {\n      sketch: gone\n    }\n    Solid b {\n      symbol: Nowhere\n    }\n    Terrain land {\n      heights: "h.png"\n      picture: missing\n    }\n    Shape tag {\n      anchor: ghost\n      layout {\n        position: 0, 0\n        size: 10, 10\n      }\n    }\n',
    );
    const messages = render(source)
      .diagnostics.filter(found => found.code === 'unknown-reference')
      .map(found => found.ownerId);
    expect(messages).toEqual(['a', 'b', 'land', 'tag']);
  });
});
