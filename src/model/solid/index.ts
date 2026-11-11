// A Solid: an outline pulled up into a body, with exact faces and edges. The outline lies on the ground, across x and
// z, with its middle at the origin, and the body rises from 0 to its height along y. A chamfer cuts the rim round its
// top and round its bottom.
import { type Outline, type Ring, ringArea } from '../outline';

export interface SolidShape {
  // The outline in the unit square: bodies with the inside on their left, holes running the other way.
  rings: Outline;
  // Width along x, height along y, depth along z.
  size: [number, number, number];
  chamfer: number;
}

export interface SolidGeometry {
  positions: Float32Array;
  normals: Float32Array;
}

type P = [number, number];

const cross = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

function segmentsCross(a: P, b: P, c: P, d: P): boolean {
  const [d1, d2, d3, d4] = [cross(c, d, a), cross(c, d, b), cross(a, b, c), cross(a, b, d)];
  return d1 * d2 < -1e-14 && d3 * d4 < -1e-14;
}

function inRing(ring: Ring, [x, y]: P): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[j];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) {
      inside = !inside;
    }
  }
  return inside;
}

// A body and its holes as one closed line: every hole is tied to the rim by a cut there and back.
function withBridges(body: Ring, holes: Ring[]): Ring {
  let line = [...body];
  const left = [...holes].sort((a, b) => Math.max(...b.map(p => p[0])) - Math.max(...a.map(p => p[0])));
  for (const hole of left) {
    let best: [number, number] | undefined;
    let nearest = Number.POSITIVE_INFINITY;
    const edges: Array<[P, P]> = [
      ...line.map((p, i) => [p, line[(i + 1) % line.length]] as [P, P]),
      ...left.flatMap(other => other.map((p, i) => [p, other[(i + 1) % other.length]] as [P, P])),
    ];
    for (let h = 0; h < hole.length; h += 1) {
      for (let l = 0; l < line.length; l += 1) {
        const distance = Math.hypot(hole[h][0] - line[l][0], hole[h][1] - line[l][1]);
        if (distance >= nearest || edges.some(([c, d]) => segmentsCross(hole[h], line[l], c, d))) {
          continue;
        }
        nearest = distance;
        best = [h, l];
      }
    }
    if (!best) {
      continue;
    }
    const [h, l] = best;
    const round = [...hole.slice(h), ...hole.slice(0, h), hole[h]];
    line = [...line.slice(0, l + 1), ...round, ...line.slice(l)];
  }
  return line;
}

// Triangles of a closed line that runs with its inside on the left: ears are cut off until three points are left.
function ears(line: Ring): Array<[P, P, P]> {
  const triangles: Array<[P, P, P]> = [];
  const rest = [...line];
  let guard = rest.length * rest.length + 8;
  while (rest.length > 3 && guard > 0) {
    guard -= 1;
    let cut = false;
    for (let i = 0; i < rest.length; i += 1) {
      const [a, b, c] = [rest[(i + rest.length - 1) % rest.length], rest[i], rest[(i + 1) % rest.length]];
      if (cross(a, b, c) <= 1e-14) {
        continue;
      }
      const blocked = rest.some(
        p =>
          p !== a && p !== b && p !== c && cross(a, b, p) > 1e-12 && cross(b, c, p) > 1e-12 && cross(c, a, p) > 1e-12,
      );
      if (blocked) {
        continue;
      }
      triangles.push([a, b, c]);
      rest.splice(i, 1);
      cut = true;
      break;
    }
    if (!cut) {
      // A point on a straight line, or one met twice by a bridge, is no ear and is dropped.
      rest.splice(0, 1);
    }
  }
  if (rest.length === 3 && Math.abs(cross(rest[0], rest[1], rest[2])) > 1e-14) {
    triangles.push([rest[0], rest[1], rest[2]]);
  }
  return triangles;
}

function triangulate(rings: Outline): Array<[P, P, P]> {
  const bodies = rings.filter(ring => ringArea(ring) > 0);
  const holes = rings.filter(ring => ringArea(ring) < 0);
  return bodies.flatMap(body =>
    ears(
      withBridges(
        body,
        holes.filter(hole => inRing(body, hole[0])),
      ),
    ),
  );
}

// A ring drawn in by a distance, point for point, so each point keeps its partner.
function inset(ring: Ring, distance: number): Ring {
  if (distance === 0) {
    return ring;
  }
  return ring.map((point, i) => {
    const before = ring[(i + ring.length - 1) % ring.length];
    const after = ring[(i + 1) % ring.length];
    const inward = (from: P, to: P): P => {
      const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
      return [-(to[1] - from[1]) / length, (to[0] - from[0]) / length];
    };
    const [n1, n2] = [inward(before, point), inward(point, after)];
    const reach = Math.min(3, 1 / Math.max(0.2, 1 + n1[0] * n2[0] + n1[1] * n2[1]));
    return [point[0] + (n1[0] + n2[0]) * reach * distance, point[1] + (n1[1] + n2[1]) * reach * distance];
  });
}

const SMOOTH = Math.cos((32 * Math.PI) / 180);

export function buildSolid(shape: SolidShape): SolidGeometry {
  const [width, height, depth] = shape.size;
  const rings = shape.rings.map(ring => ring.map(([x, y]) => [(x - 0.5) * width, (y - 0.5) * depth] as P));
  const chamfer = Math.max(0, Math.min(shape.chamfer, height / 2 - 1e-6, Math.min(width, depth) / 4));
  const positions: number[] = [];
  const normals: number[] = [];
  const corner = (p: P, y: number, n: [number, number, number]) => {
    positions.push(p[0], y, p[1]);
    normals.push(n[0], n[1], n[2]);
  };
  // A triangle is written so that it faces the way its corners say.
  const triangle = (a: [P, number], b: [P, number], c: [P, number], n: Array<[number, number, number]>) => {
    const u = [b[0][0] - a[0][0], b[1] - a[1], b[0][1] - a[0][1]];
    const v = [c[0][0] - a[0][0], c[1] - a[1], c[0][1] - a[0][1]];
    const face = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const mean = [n[0][0] + n[1][0] + n[2][0], n[0][1] + n[1][1] + n[2][1], n[0][2] + n[1][2] + n[2][2]];
    if (face[0] * mean[0] + face[1] * mean[1] + face[2] * mean[2] >= 0) {
      corner(a[0], a[1], n[0]);
      corner(b[0], b[1], n[1]);
      corner(c[0], c[1], n[2]);
    } else {
      corner(a[0], a[1], n[0]);
      corner(c[0], c[1], n[2]);
      corner(b[0], b[1], n[1]);
    }
  };
  const quad = (a: [P, number], b: [P, number], c: [P, number], d: [P, number], n: Array<[number, number, number]>) => {
    triangle(a, b, c, [n[0], n[1], n[2]]);
    triangle(a, c, d, [n[0], n[2], n[3]]);
  };

  const caps = rings.map(ring => inset(ring, chamfer));
  for (const [a, b, c] of triangulate(caps)) {
    triangle(
      [a, height],
      [b, height],
      [c, height],
      [
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 0],
      ],
    );
    triangle(
      [a, 0],
      [b, 0],
      [c, 0],
      [
        [0, -1, 0],
        [0, -1, 0],
        [0, -1, 0],
      ],
    );
  }

  rings.forEach((ring, r) => {
    const cap = caps[r];
    const count = ring.length;
    // The way each wall faces, and for each point the way the wall faces there: across a gentle bend it is shared.
    const out = ring.map((point, i): P => {
      const next = ring[(i + 1) % count];
      const length = Math.hypot(next[0] - point[0], next[1] - point[1]) || 1;
      return [(next[1] - point[1]) / length, -(next[0] - point[0]) / length];
    });
    const at = (i: number, wall: number): P => {
      const other = out[(i === wall ? wall + count - 1 : wall + 1) % count];
      const own = out[wall];
      if (own[0] * other[0] + own[1] * other[1] < SMOOTH) {
        return own;
      }
      const length = Math.hypot(own[0] + other[0], own[1] + other[1]) || 1;
      return [(own[0] + other[0]) / length, (own[1] + other[1]) / length];
    };
    for (let i = 0; i < count; i += 1) {
      const j = (i + 1) % count;
      const [ni, nj] = [at(i, i), at(j, i)];
      const side = (n: P): [number, number, number] => [n[0], 0, n[1]];
      const slope = (n: P, up: number): [number, number, number] => [
        n[0] * Math.SQRT1_2,
        up * Math.SQRT1_2,
        n[1] * Math.SQRT1_2,
      ];
      quad(
        [ring[i], chamfer],
        [ring[j], chamfer],
        [ring[j], height - chamfer],
        [ring[i], height - chamfer],
        [side(ni), side(nj), side(nj), side(ni)],
      );
      if (chamfer > 0) {
        quad(
          [ring[i], height - chamfer],
          [ring[j], height - chamfer],
          [cap[j], height],
          [cap[i], height],
          [slope(ni, 1), slope(nj, 1), slope(nj, 1), slope(ni, 1)],
        );
        quad(
          [ring[i], chamfer],
          [ring[j], chamfer],
          [cap[j], 0],
          [cap[i], 0],
          [slope(ni, -1), slope(nj, -1), slope(nj, -1), slope(ni, -1)],
        );
      }
    }
  });
  return { positions: new Float32Array(positions), normals: new Float32Array(normals) };
}

export const SOLID_ASSET = 'solid:';

export const solidAssetName = (shape: SolidShape): string => SOLID_ASSET + JSON.stringify(shape);

export function solidOfAsset(asset: string): SolidShape | undefined {
  if (!asset.startsWith(SOLID_ASSET)) {
    return undefined;
  }
  try {
    return JSON.parse(asset.slice(SOLID_ASSET.length)) as SolidShape;
  } catch {
    return undefined;
  }
}
