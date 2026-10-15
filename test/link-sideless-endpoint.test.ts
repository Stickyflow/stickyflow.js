import { describe, expect, it } from 'vitest';
import { render } from '../src/render';

const board = (bx: number, by: number) => `sfl 1.2

Model m {
  Shape a { text: "A"; layout { position: 0, 0; size: 180, 60 } }
  Shape b { text: "B"; layout { position: ${bx}, ${by}; size: 180, 60 } }
  Link l1 { from: a; to: b }
}
`;

function linkPath(sfl: string): string {
  const { svg } = render(sfl, { idPrefix: 'v' });
  const match = svg.match(/<path[^>]*data-sf-role="link"[^>]*d="([^"]+)"/);
  return match ? match[1] : '';
}

function endpoints(d: string): { start: [number, number]; end: [number, number] } {
  const coordinates = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
  if (!coordinates || coordinates.length < 4) {
    throw new Error(`Path has no complete endpoints: ${d}`);
  }
  return {
    start: [coordinates[0], coordinates[1]],
    end: [coordinates[coordinates.length - 2], coordinates[coordinates.length - 1]],
  };
}

describe('links with no explicit side', () => {
  it.each([
    ['b below', 0, 200, [90, 60], [90, 200]],
    ['b above', 0, -200, [90, 0], [90, -140]],
    ['b to the right', 400, 0, [180, 30], [400, 30]],
    ['b to the left', -400, 0, [0, 30], [-220, 30]],
  ] as const)('anchors on the facing edge, not the centre (%s)', (_name, bx, by, start, end) => {
    const { start: got, end: gotEnd } = endpoints(linkPath(board(bx, by)));
    expect(got).toEqual([...start]);
    expect(gotEnd).toEqual([...end]);
  });

  it('never starts or ends inside either shape', () => {
    const inside = (x: number, y: number, ex: number, ey: number) => x > ex && x < ex + 180 && y > ey && y < ey + 60;

    for (const [bx, by] of [
      [0, 200],
      [0, -200],
      [400, 0],
      [-400, 0],
      [400, 300],
    ] as const) {
      const { start, end } = endpoints(linkPath(board(bx, by)));
      expect(inside(start[0], start[1], 0, 0), `start inside a for b(${bx},${by})`).toBe(false);
      expect(inside(end[0], end[1], bx, by), `end inside b for b(${bx},${by})`).toBe(false);
    }
  });

  it('leaves an explicitly anchored link untouched', () => {
    const explicit = `sfl 1.2

Model m {
  Shape a { text: "A"; layout { position: 0, 0; size: 180, 60 } }
  Shape b { text: "B"; layout { position: 0, 200; size: 180, 60 } }
  Link l1 { from: a, bottom (0.25); to: b, top (0.75) }
}
`;
    const { start, end } = endpoints(linkPath(explicit));
    expect(start).toEqual([45, 60]);
    expect(end).toEqual([135, 200]);
  });
});
