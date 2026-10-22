import { describe, expect, it } from 'vitest';
import { render } from '../src';
import { cleanFootprint, extrudeFootprint, roundFootprint } from '../src/model/isometricObject';

const L_SHAPE: Array<[number, number]> = [
  [0, 0],
  [1, 0],
  [1, 0.4],
  [0.4, 0.4],
  [0.4, 1],
  [0, 1],
];

const SOURCE = `sfl 1.5

Symbol L {
  points: [[0, 0], [1, 0], [1, 0.4], [0.4, 0.4], [0.4, 1], [0, 1]]
}

Model city {
  Isometric block {
    symbol: L

    layout {
      position: 10, 20
      size: 200, 150, 200
    }

    style {
      fill: "#e8edf5"
    }
  }
}
`;

describe('Isometric footprint', () => {
  it('extrudes a named symbol into a top and the walls that face the viewer', () => {
    const result = render(SOURCE);

    expect(result.diagnostics).toEqual([]);
    const ids = result.scene.nodes.map(node => node.id);
    expect(ids).toContain('isometric-block-top');
    expect(ids.filter(id => id.startsWith('isometric-block-side-')).length).toBeGreaterThanOrEqual(3);
    expect(ids).not.toContain('isometric-block-front');
    expect(result.svg).toContain('id="sf-isometric-block-top"');
  });

  it('keeps the plain box when there is no symbol', () => {
    const result = render(SOURCE.replace('    symbol: L\n', ''));

    expect(result.scene.nodes.map(node => node.id)).toContain('isometric-block-front');
  });

  it('draws farther walls before nearer ones', () => {
    const { sides } = extrudeFootprint({ x: 0, y: 0, width: 100, height: 80, depth: 100 }, L_SHAPE);

    expect(sides.map(side => side.depth)).toEqual([...sides.map(side => side.depth)].sort((a, b) => a - b));
  });

  it('works the same for either direction of the polygon', () => {
    const frame = { x: 0, y: 0, width: 100, height: 80, depth: 100 };
    const forward = extrudeFootprint(frame, L_SHAPE);
    const backward = extrudeFootprint(frame, [...L_SHAPE].reverse());

    expect(backward.sides).toHaveLength(forward.sides.length);
  });

  it('ignores a footprint that is not a polygon', () => {
    expect(
      cleanFootprint([
        [0, 0],
        [1, 1],
      ]),
    ).toEqual([]);
    expect(cleanFootprint(undefined)).toEqual([]);
  });

  it('rounds the corners of the outline by a radius in canvas units', () => {
    const rounded = roundFootprint(L_SHAPE, 20, 200, 200);

    expect(rounded.length).toBeGreaterThan(L_SHAPE.length);
    expect(roundFootprint(L_SHAPE, 0, 200, 200)).toEqual(L_SHAPE);
    for (const [u, v] of rounded) {
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThanOrEqual(1);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('never takes more than half of an edge for a corner', () => {
    const rounded = roundFootprint(L_SHAPE, 10_000, 200, 200);

    expect(rounded.every(([u, v]) => Number.isFinite(u) && Number.isFinite(v))).toBe(true);
  });

  it('draws a rounded outline with more walls than a sharp one', () => {
    const sharp = render(SOURCE);
    const rounded = render(SOURCE.replace('fill: "#e8edf5"', 'fill: "#e8edf5"; cornerRadius: 24'));
    const walls = (result: ReturnType<typeof render>) =>
      result.scene.nodes.filter(node => node.id.startsWith('isometric-block-side-')).length;

    expect(walls(rounded)).toBeGreaterThan(walls(sharp));
  });
});

describe('Isometric sphere', () => {
  const SPHERE = `sfl 1.5

Model scene {
  Isometric ball {
    layout {
      position: 10, 20
      size: 100, 100, 100
    }

    style {
      shape: sphere
      fill: "#6d5ef0"
    }
  }
}
`;

  it('draws a shaded circle instead of the three faces', () => {
    const result = render(SPHERE);
    const ids = result.scene.nodes.map(node => node.id);

    expect(result.diagnostics).toEqual([]);
    expect(ids).toContain('isometric-ball-sphere');
    expect(ids).toContain('isometric-ball-highlight');
    expect(ids).not.toContain('isometric-ball-top');
  });

  it('is as large as the smallest side of its box', () => {
    const result = render(SPHERE.replace('100, 100, 100', '100, 60, 100'));
    const body = result.scene.nodes.find(node => node.id === 'isometric-ball-sphere');

    expect(body).toMatchObject({ type: 'ellipse', rx: 30, ry: 30 });
  });
});
