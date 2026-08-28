import { describe, it, expect } from 'vitest';
import { render } from '../src/render';

// `Link l { from: a; to: b }` with no `, side` is valid SFL, and it is the
// shortest form : the one a person writes by hand, the one a language model
// produces, and the one `insertLink()` emits when the caller passes no
// fromSide/toSide. It used to resolve both endpoints to the elements' CENTRES,
// and since links are painted after entities the segment was drawn visibly
// through both shapes rather than between them. No diagnostic was raised, and
// no test covered the geometry, so nothing caught it.
//
// getPathPoints already picks a side by quadrant in this exact case; the
// endpoints now use the same heuristic, so the two agree.

const board = (bx: number, by: number) => `sfl 1.2

Model m {
  Entity a { text: "A"; layout { position: 0, 0; size: 180, 60 } }
  Entity b { text: "B"; layout { position: ${bx}, ${by}; size: 180, 60 } }
  Link l1 { from: a; to: b }
}
`;

/** The link's path data, as emitted. */
function linkPath(sfl: string): string {
  const { svg } = render(sfl, { idPrefix: 'v' });
  const match = svg.match(/<path[^>]*data-sf-role="link"[^>]*d="([^"]+)"/);
  return match ? match[1] : '';
}

/** First and last coordinate pair of a path, whatever the commands between. */
function endpoints(d: string): { start: [number, number]; end: [number, number] } {
  const nums = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  return { start: [nums[0], nums[1]], end: [nums[nums.length - 2], nums[nums.length - 1]] };
}

describe('links with no explicit side', () => {
  // a occupies x 0..180, y 0..60.
  it.each([
    // name,          b x,   b y,   expected start,      expected end
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
    const inside = (x: number, y: number, ex: number, ey: number) =>
      x > ex && x < ex + 180 && y > ey && y < ey + 60;

    for (const [bx, by] of [[0, 200], [0, -200], [400, 0], [-400, 0], [400, 300]] as const) {
      const { start, end } = endpoints(linkPath(board(bx, by)));
      expect(inside(start[0], start[1], 0, 0), `start inside a for b(${bx},${by})`).toBe(false);
      expect(inside(end[0], end[1], bx, by), `end inside b for b(${bx},${by})`).toBe(false);
    }
  });

  it('leaves an explicitly anchored link untouched', () => {
    const explicit = `sfl 1.2

Model m {
  Entity a { text: "A"; layout { position: 0, 0; size: 180, 60 } }
  Entity b { text: "B"; layout { position: 0, 200; size: 180, 60 } }
  Link l1 { from: a, bottom (0.25); to: b, top (0.75) }
}
`;
    const { start, end } = endpoints(linkPath(explicit));
    expect(start).toEqual([45, 60]);
    expect(end).toEqual([135, 200]);
  });
});
