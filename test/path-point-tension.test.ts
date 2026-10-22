import { describe, expect, it } from 'vitest';
import { flattenPath, pathToSymbol, render, sflToCanvasState, symbolToPath } from '../src';
import { applyMoveChange, applyPathPointChange } from '../src/runtime/interaction';

const PATH = `sfl 1.5

Model m {
  Path outline {
    points: [[0, 0, 0], [100, 0, 0], [100, 60, 0.8], [0, 60, 0.8]]
    closed: true
    tension: 0.5
  }
}
`;

const pathData = (source: string) => {
  const node = render(source).scene.nodes.find(candidate => candidate.id === 'path-outline');
  return node && 'd' in node ? node.d : '';
};

describe('Per-point tension of a path', () => {
  it('reads a third value of a point as its tension', () => {
    const [outline] = sflToCanvasState(PATH).canvasObjects;

    expect(outline.path?.points.map(point => point.tension)).toEqual([0, 0, 0.8, 0.8]);
  });

  it('keeps a straight side between two corners and curves the others', () => {
    const data = pathData(PATH);

    expect(data).toMatch(/L 100 0/);
    expect(data).toMatch(/C /);
  });

  it('draws the same path as before when no point sets a tension', () => {
    const plain = PATH.replace(/, 0\.8\]/g, ']').replace(/, 0\]/g, ']');

    expect(pathData(plain)).not.toMatch(/L 100 0/);
    expect(pathData(plain)).toMatch(/^M 0 0 C /);
  });

  it('moves a path whose points carry a tension', () => {
    const moved = applyMoveChange(PATH, { owner: { id: 'outline', role: 'path' }, dx: 10, dy: 5 });

    expect(moved).toContain('[10, 5, 0]');
    expect(moved).toContain('[110, 65, 0.8]');
  });

  it('keeps the tensions when one point is dragged', () => {
    const next = applyPathPointChange(PATH, {
      owner: { id: 'outline', role: 'path' },
      points: [
        { x: 4, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 60 },
        { x: 0, y: 60 },
      ],
    } as never);

    expect(next).toContain('[4, 0, 0]');
    expect(next).toContain('[100, 60, 0.8]');
  });
});

describe('Path and symbol', () => {
  it('writes an outline into the unit square and back', () => {
    const points = [
      { x: 200, y: 100 },
      { x: 400, y: 100 },
      { x: 400, y: 300, tension: 0.4 },
      { x: 200, y: 300 },
    ];
    const symbol = pathToSymbol(points);

    expect(symbol).toMatchObject({ width: 200, height: 200 });
    expect(symbol.points).toEqual([
      [0, 0],
      [1, 0],
      [1, 1, 0.4],
      [0, 1],
    ]);
    expect(symbolToPath(symbol.points, { x: 200, y: 100, width: 200, height: 200 })).toEqual(points);
  });

  it('turns a curve into many short edges', () => {
    const flat = flattenPath({
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
      tension: 1,
      closed: true,
    });

    expect(flat.length).toBeGreaterThan(4);
  });

  it('extrudes a symbol with soft points into a rounded body', () => {
    const source = (points: string) => `sfl 1.5

Symbol S {
  points: ${points}
}

Model m {
  Isometric block {
    symbol: S
    layout {
      position: 0, 0
      size: 100, 80, 100
    }
  }
}
`;
    const walls = (text: string) =>
      render(text).scene.nodes.filter(node => node.id.startsWith('isometric-block-side-')).length;

    const sharp = walls(source('[[0, 0], [1, 0], [1, 1], [0, 1]]'));
    const soft = walls(source('[[0, 0, 0.8], [1, 0, 0.8], [1, 1, 0.8], [0, 1, 0.8]]'));

    expect(soft).toBeGreaterThan(sharp);
  });
});
