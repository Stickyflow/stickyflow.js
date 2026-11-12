// A Solid: an outline pulled up into a body, with exact faces and edges. The outline lies on the ground, across x and
// z, with its middle at the origin, and the body rises from 0 to its height along y. A chamfer cuts the rim round its
// top and round its bottom.
import { type Outline, type Ring, ringArea } from '../outline';
import { roundedRing } from '../sketch';
import { type Corner, type Face, faceOf, type Joining, joinBodies, type V3 } from './combine';

export interface SolidShape {
  // The outline in the unit square: bodies with the inside on their left, holes running the other way.
  rings: Outline;
  // Width along x, height along y, depth along z.
  size: [number, number, number];
  chamfer: number;
  // The rim of the bottom, when it is not as wide as the one of the top, which `chamfer` is then.
  chamferBottom?: number;
  // Rounded instead of cut straight.
  round?: boolean;
  // Upright edges, each a corner of a ring of the outline: the ring, the corner, how far it is cut, and 1 to round it, 0 to
  // cut it straight.
  corners?: Array<[number, number, number, number]>;
  // Single edges of the top or the bottom, each the edge of the outline from one of its corners to the next: the ring,
  // that corner, how far it is cut, 1 for the top and 0 for the bottom, and 1 to round it, 0 to cut it straight.
  edges?: Array<[number, number, number, number, number]>;
  // The top as another outline than the bottom: drawn in by `taper` (out, when it is less than 0), moved by `shift` across x
  // and z, or an outline of its own in the same unit square, which the walls run to from the bottom.
  taper?: number;
  shift?: [number, number];
  top?: Outline;
  // Bodies that are added to it, cut out of it, or kept with it, in the order they are written.
  joins?: SolidJoin[];
}

export interface SolidJoin extends SolidShape {
  joining: Joining;
  // Where it stands and how it is turned, measured from the middle of the ground of the Solid it joins.
  position: [number, number, number];
  rotation: [number, number, number];
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

function triangulate(rings: Outline, keepStraight = false): Array<[P, P, P]> {
  const bodies = rings.filter(ring => ringArea(ring) > 0);
  const holes = rings.filter(ring => ringArea(ring) < 0);
  const triangles = bodies.flatMap(body =>
    ears(
      withBridges(
        body,
        holes.filter(hole => inRing(body, hole[0])),
      ),
    ),
  );
  return keepStraight ? withStraightPoints(triangles, rings) : triangles;
}

// The points that lie on a straight edge, which no ear takes, are put back into the triangle whose edge they lie on, so
// the cap meets the walls point for point.
function withStraightPoints(triangles: Array<[P, P, P]>, rings: Outline): Array<[P, P, P]> {
  const list = [...triangles];
  for (const ring of rings) {
    ring.forEach(point => {
      for (let t = 0; t < list.length; t += 1) {
        const tri = list[t];
        for (let e = 0; e < 3; e += 1) {
          const [u, v, w] = [tri[e], tri[(e + 1) % 3], tri[(e + 2) % 3]];
          const length = Math.hypot(v[0] - u[0], v[1] - u[1]);
          if (point === u || point === v || length < 1e-12) {
            continue;
          }
          const along = ((point[0] - u[0]) * (v[0] - u[0]) + (point[1] - u[1]) * (v[1] - u[1])) / (length * length);
          if (along <= 1e-9 || along >= 1 - 1e-9 || Math.abs(cross(u, v, point)) / length > 1e-9) {
            continue;
          }
          list.splice(t, 1, [u, point as P, w], [point as P, v, w]);
          return;
        }
      }
    });
  }
  return list;
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
    // At a sharp corner the point would run far out, as a spike. It goes no farther than a little past the distance.
    const sum = Math.hypot(n1[0] + n2[0], n1[1] + n2[1]) || 1;
    const reach = Math.min(1.5 / sum, 1 / Math.max(0.05, 1 + n1[0] * n2[0] + n1[1] * n2[1]));
    return [point[0] + (n1[0] + n2[0]) * reach * distance, point[1] + (n1[1] + n2[1]) * reach * distance];
  });
}

// Whether rings drawn in by a distance are still an outline: no edge has turned round, and no two edges cross.
function holds(rings: Outline, distance: number): boolean {
  const drawn = rings.map(ring => inset(ring, distance));
  const edges: Array<[P, P]> = [];
  for (let r = 0; r < rings.length; r += 1) {
    const [before, after] = [rings[r], drawn[r]];
    for (let i = 0; i < before.length; i += 1) {
      const j = (i + 1) % before.length;
      const kept =
        (before[j][0] - before[i][0]) * (after[j][0] - after[i][0]) +
        (before[j][1] - before[i][1]) * (after[j][1] - after[i][1]);
      if (kept <= 0) {
        return false;
      }
      edges.push([after[i], after[j]]);
    }
  }
  for (let a = 0; a < edges.length; a += 1) {
    for (let b = a + 1; b < edges.length; b += 1) {
      if (segmentsCross(edges[a][0], edges[a][1], edges[b][0], edges[b][1])) {
        return false;
      }
    }
  }
  // A hole that has grown past the body round it is gone from the outline, so the rim may not reach that far.
  const bodies = drawn.filter((_, r) => ringArea(rings[r]) > 0);
  return drawn.every(
    (ring, r) => ringArea(rings[r]) >= 0 || ring.every(point => bodies.some(body => inRing(body, point))),
  );
}

// The widest chamfer an outline takes, up to the one asked for. A narrow web or a small hole takes less than a wide
// face, and gets less, so the rim never folds over itself.
function safeChamfer(rings: Outline, wanted: number): number {
  if (wanted <= 0 || holds(rings, wanted)) {
    return Math.max(0, wanted);
  }
  let [low, high] = [0, wanted];
  for (let step = 0; step < 7; step += 1) {
    const middle = (low + high) / 2;
    if (holds(rings, middle)) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return low * 0.9;
}

const SMOOTH = Math.cos((32 * Math.PI) / 180);
const ROUND_STEPS = 6;

// Where along a ring each of its points lies, from 0 at the first to 1 all the way round.
function fractions(ring: P[]): number[] {
  const lengths = ring.map((p, i) => {
    const q = ring[(i + 1) % ring.length];
    return Math.hypot(q[0] - p[0], q[1] - p[1]);
  });
  const total = lengths.reduce((sum, length) => sum + length, 0) || 1;
  let run = 0;
  return lengths.map(length => {
    const at = run / total;
    run += length;
    return at;
  });
}

function sampleRing(ring: P[], at: number[], where: number[]): P[] {
  return where.map(t => {
    let i = at.length - 1;
    while (i > 0 && at[i] > t) {
      i -= 1;
    }
    const next = i + 1 < at.length ? at[i + 1] : 1;
    const k = next - at[i] > 1e-12 ? (t - at[i]) / (next - at[i]) : 0;
    const [p, q] = [ring[i], ring[(i + 1) % ring.length]];
    return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
  });
}

// A bottom ring and a top ring with as many points each, point for point partners: the top is started where its point
// lies most nearly the way the first point of the bottom lies, and both are cut at all the places either has a corner.
function partners(bottom: P[], top: P[]): [P[], P[]] {
  const middle = (ring: P[]): P => [
    ring.reduce((sum, p) => sum + p[0], 0) / ring.length,
    ring.reduce((sum, p) => sum + p[1], 0) / ring.length,
  ];
  let upper = ringArea(top) * ringArea(bottom) < 0 ? [...top].reverse() : top;
  const [mb, mt] = [middle(bottom), middle(upper)];
  const way = Math.atan2(bottom[0][1] - mb[1], bottom[0][0] - mb[0]);
  let start = 0;
  let nearest = Number.POSITIVE_INFINITY;
  upper.forEach((p, i) => {
    const off = Math.abs(
      Math.atan2(
        Math.sin(Math.atan2(p[1] - mt[1], p[0] - mt[0]) - way),
        Math.cos(Math.atan2(p[1] - mt[1], p[0] - mt[0]) - way),
      ),
    );
    if (off < nearest) {
      nearest = off;
      start = i;
    }
  });
  upper = [...upper.slice(start), ...upper.slice(0, start)];
  const [fb, ft] = [fractions(bottom), fractions(upper)];
  const all = [...fb, ...ft].sort((a, b) => a - b).filter((t, i, list) => i === 0 || t - list[i - 1] > 1e-4);
  return [sampleRing(bottom, fb, all), sampleRing(upper, ft, all)];
}

// The bottom and the top of a Solid as placed rings, point for point partners.
function outlines(shape: SolidShape): { bottom: P[][]; top: P[][] } {
  const [width, , depth] = shape.size;
  const place = (ring: Ring): P[] => ring.map(([x, y]) => [(x - 0.5) * width, (y - 0.5) * depth] as P);
  const rounded = (placed: P[], r: number): P[] => {
    const own = (shape.corners ?? []).filter(([at]) => at === r);
    if (own.length === 0) {
      return placed;
    }
    const sizes = placed.map((_, i) => own.find(([, at]) => at === i)?.[2] ?? 0);
    const straight = placed.map((_, i) => own.find(([, at]) => at === i)?.[3] === 0);
    return roundedRing(placed, sizes, straight) as P[];
  };
  const bottom = shape.rings.map((ring, r) => rounded(place(ring), r));
  const [dx, dz] = shape.shift ?? [0, 0];
  const moved = (ring: P[]): P[] => inset(ring, shape.taper ?? 0).map(([x, z]) => [x + dx, z + dz] as P);
  // An outline of its own on top: each of its rings is the partner of the bottom ring it is nearest to, in the order written.
  const own = shape.top?.map(place);
  if (!own || own.length !== bottom.length) {
    return { bottom, top: bottom.map(moved) };
  }
  const pairs = bottom.map((ring, r) => partners(ring, own[r]));
  return { bottom: pairs.map(([b]) => b), top: pairs.map(([, t]) => moved(t)) };
}

function plainSolid(shape: SolidShape): SolidGeometry {
  const [width, height, depth] = shape.size;
  const { bottom: rings, top: tops } = outlines(shape);
  // The outline at a height: the bottom on the ground, the top on top, and in between as far between as it lies.
  const lofted = shape.top !== undefined || Boolean(shape.taper) || Boolean(shape.shift?.[0] || shape.shift?.[1]);
  const ringAt = (r: number, y: number): P[] => {
    if (!lofted) {
      return rings[r];
    }
    const t = height > 0 ? y / height : 0;
    return rings[r].map((p, i) => [p[0] + (tops[r][i][0] - p[0]) * t, p[1] + (tops[r][i][1] - p[1]) * t] as P);
  };
  const most = (wanted: number) => Math.max(0, Math.min(wanted, height / 2 - 1e-6, Math.min(width, depth) / 4));
  const top = safeChamfer(tops, most(shape.chamfer));
  const bottom = safeChamfer(rings, most(shape.chamferBottom ?? shape.chamfer));
  // The profile of a rim, from the wall to the cap: how far each step lies in from the outline, how far it lies on from where
  // the wall ends, and the way it faces, out and up. A chamfer is one step, a rounding a quarter of a circle.
  const steps = shape.round ? ROUND_STEPS : 1;
  const profile = (size: number) =>
    Array.from({ length: steps + 1 }, (_, k) => {
      const angle = (k / steps) * (Math.PI / 2);
      return shape.round
        ? {
            inward: size * (1 - Math.cos(angle)),
            along: size * Math.sin(angle),
            out: Math.cos(angle),
            up: Math.sin(angle),
          }
        : { inward: size * (k / steps), along: size * (k / steps), out: Math.SQRT1_2, up: Math.SQRT1_2 };
    });
  const rims = [
    { size: top, profile: profile(top), from: height - top, way: 1 },
    { size: bottom, profile: profile(bottom), from: bottom, way: -1 },
  ];
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

  // The caps, each as far in as its rim reaches.
  for (const [rim, y, up] of [
    [rims[0], height, 1],
    [rims[1], 0, -1],
  ] as const) {
    const caps = (y > 0 ? tops : rings).map(ring => inset(ring, rim.size));
    for (const [a, b, c] of triangulate(caps, shape.top !== undefined)) {
      triangle(
        [a, y],
        [b, y],
        [c, y],
        [
          [0, up, 0],
          [0, up, 0],
          [0, up, 0],
        ],
      );
    }
  }

  rings.forEach((ground, r) => {
    const count = ground.length;
    // The walls are judged half way up, where a top of its own has turned them half way.
    const ring = ringAt(r, height / 2);
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
    // The outline drawn in by each step of each rim.
    const drawn = rims.map(rim =>
      rim.profile.map(step => {
        const level = ringAt(r, rim.from + rim.way * step.along);
        return step.inward > 0 ? inset(level, step.inward) : level;
      }),
    );
    const [low, high] = [ringAt(r, bottom), ringAt(r, height - top)];
    // A wall that leans out or in faces down or up as much: how far its point moves out for each step up.
    const lean = (n: P, i: number) =>
      height > 0 ? ((tops[r][i][0] - ground[i][0]) * n[0] + (tops[r][i][1] - ground[i][1]) * n[1]) / height : 0;
    for (let i = 0; i < count; i += 1) {
      const j = (i + 1) % count;
      const [ni, nj] = [at(i, i), at(j, i)];
      const side = (n: P, k: number): [number, number, number] => {
        const up = lofted ? -lean(n, k) : 0;
        const length = Math.hypot(n[0], up, n[1]) || 1;
        return [n[0] / length, up / length, n[1] / length];
      };
      quad(
        [low[i], bottom],
        [low[j], bottom],
        [high[j], height - top],
        [high[i], height - top],
        [side(ni, i), side(nj, j), side(nj, j), side(ni, i)],
      );
      rims.forEach((rim, r) => {
        if (rim.size <= 0) {
          return;
        }
        const facing = (n: P, k: number): [number, number, number] => {
          const step = rim.profile[k];
          const length = Math.hypot(step.out, step.up) || 1;
          return [(n[0] * step.out) / length, (rim.way * step.up) / length, (n[1] * step.out) / length];
        };
        for (let k = 0; k < steps; k += 1) {
          const [a, b] = [rim.profile[k], rim.profile[k + 1]];
          const [ya, yb] = [rim.from + rim.way * a.along, rim.from + rim.way * b.along];
          // A chamfer faces one way along its whole width. A rounding turns from step to step.
          const [ka, kb] = shape.round ? [k, k + 1] : [0, 0];
          quad(
            [drawn[r][k][i], ya],
            [drawn[r][k][j], ya],
            [drawn[r][k + 1][j], yb],
            [drawn[r][k + 1][i], yb],
            [facing(ni, ka), facing(nj, ka), facing(nj, kb), facing(ni, kb)],
          );
        }
      });
    }
  });
  return { positions: new Float32Array(positions), normals: new Float32Array(normals) };
}

// Rotation about x, then y, then z, in degrees, as rows.
export function turn([x, y, z]: V3): number[] {
  const [a, b, c] = [x, y, z].map(angle => (angle * Math.PI) / 180);
  const [sa, ca, sb, cb, sc, cc] = [Math.sin(a), Math.cos(a), Math.sin(b), Math.cos(b), Math.sin(c), Math.cos(c)];
  return [
    cc * cb,
    cc * sb * sa - sc * ca,
    cc * sb * ca + sc * sa,
    sc * cb,
    sc * sb * sa + cc * ca,
    sc * sb * ca - cc * sa,
    -sb,
    cb * sa,
    cb * ca,
  ];
}

function facesOf(geometry: SolidGeometry, position: V3 = [0, 0, 0], rotation: V3 = [0, 0, 0]): Face[] {
  const m = turn(rotation);
  const turned = (x: number, y: number, z: number): V3 => [
    m[0] * x + m[1] * y + m[2] * z,
    m[3] * x + m[4] * y + m[5] * z,
    m[6] * x + m[7] * y + m[8] * z,
  ];
  const faces: Face[] = [];
  const { positions, normals } = geometry;
  for (let i = 0; i < positions.length; i += 9) {
    const corners: Corner[] = [0, 3, 6].map(k => {
      const at = turned(positions[i + k], positions[i + k + 1], positions[i + k + 2]);
      return {
        at: [at[0] + position[0], at[1] + position[1], at[2] + position[2]],
        normal: turned(normals[i + k], normals[i + k + 1], normals[i + k + 2]),
      };
    });
    const face = faceOf(corners);
    if (face) {
      faces.push(face);
    }
  }
  return faces;
}

// The body of a Solid, with what is joined to it. A face that a join left with more than three corners is cut into
// triangles from its first corner, which works as every such face bulges nowhere inwards.
export function buildSolid(shape: SolidShape): SolidGeometry {
  const plain = plainSolid(shape);
  if (!shape.joins?.length && !shape.edges?.length) {
    return plain;
  }
  let faces = facesOf(plain);
  for (const join of shape.joins ?? []) {
    faces = joinBodies(faces, facesOf(plainSolid(join), join.position, join.rotation), join.joining);
  }
  for (const edge of shape.edges ?? []) {
    const cutter = edgeCutter(shape, edge);
    if (cutter) {
      faces = joinBodies(faces, facesOf(cutter), 'cut');
    }
  }
  const positions: number[] = [];
  const normals: number[] = [];
  for (const face of faces) {
    for (let i = 1; i + 1 < face.corners.length; i += 1) {
      for (const corner of [face.corners[0], face.corners[i], face.corners[i + 1]]) {
        positions.push(...corner.at);
        const length = Math.hypot(...corner.normal) || 1;
        normals.push(corner.normal[0] / length, corner.normal[1] / length, corner.normal[2] / length);
      }
    }
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals) };
}

// What is taken away from a body to round or cut a single edge of its top or its bottom: a bar along that edge, whose
// cross-section is the corner between the two faces less what is left of it.
function edgeCutter(
  shape: SolidShape,
  [r, i, size, top, round]: [number, number, number, number, number],
): SolidGeometry | null {
  const [width, height, depth] = shape.size;
  const ring = shape.rings[r];
  if (!ring || size <= 0 || !ring[i]) {
    return null;
  }
  const place = ([x, y]: [number, number]): P => [(x - 0.5) * width, (y - 0.5) * depth];
  // An edge of a top that is drawn in or moved lies where the top is. With an outline of its own on top, or corners of its
  // own, the points of the top are not the ones of the outline, and the edge stays where the outline has it.
  const moved = top && !shape.top && !shape.corners?.some(([at]) => at === r) ? outlines(shape).top[r] : undefined;
  const [a, b] = moved
    ? [moved[i], moved[(i + 1) % moved.length]]
    : [place(ring[i]), place(ring[(i + 1) % ring.length])];
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (length < 1e-9) {
    return null;
  }
  const along: V3 = [(b[0] - a[0]) / length, 0, (b[1] - a[1]) / length];
  const out: V3 = [along[2], 0, -along[0]];
  const away: V3 = [0, top ? 1 : -1, 0];
  const y = top ? height : 0;
  const s = Math.min(size, height / 2, length / 2);
  // The cross-section, in steps out of the face and away from the cap, from the edge. It reaches a little past both faces so
  // the cut is clean.
  const e = s * 0.05 + 1e-4;
  const section: Array<[number, number]> = [
    [e, e],
    [e, -s],
  ];
  if (round) {
    for (let k = 0; k <= ROUND_STEPS * 2; k += 1) {
      const angle = (k / (ROUND_STEPS * 2)) * (Math.PI / 2);
      section.push([-s + s * Math.cos(angle), -s + s * Math.sin(angle)]);
    }
  } else {
    section.push([0, -s], [-s, 0]);
  }
  section.push([-s, e]);
  const ends = [-e, length + e];
  const point = (o: number, w: number, t: number): V3 => [
    a[0] + along[0] * t + out[0] * o,
    y + away[1] * w,
    a[1] + along[2] * t + out[2] * o,
  ];
  const positions: number[] = [];
  const normals: number[] = [];
  // Each triangle faces the way it is told: out of the bar.
  const triangle = (p: V3, q: V3, t: V3, facing: V3) => {
    const u: V3 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
    const v: V3 = [t[0] - p[0], t[1] - p[1], t[2] - p[2]];
    let n: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const length = Math.hypot(n[0], n[1], n[2]);
    if (length < 1e-14) {
      return;
    }
    const flip = n[0] * facing[0] + n[1] * facing[1] + n[2] * facing[2] < 0;
    n = [n[0] / length, n[1] / length, n[2] / length];
    const corners = flip ? [p, t, q] : [p, q, t];
    for (const c of corners) {
      positions.push(...c);
      normals.push(...(flip ? [-n[0], -n[1], -n[2]] : n));
    }
  };
  const count = section.length;
  // The way round the section runs, so each side knows which way is out.
  const turning =
    Math.sign(
      section.reduce(
        (sum, [o1, w1], k) => sum + o1 * section[(k + 1) % count][1] - section[(k + 1) % count][0] * w1,
        0,
      ),
    ) || 1;
  for (let k = 0; k < count; k += 1) {
    const [o1, w1] = section[k];
    const [o2, w2] = section[(k + 1) % count];
    const [no, nw] = [(w2 - w1) * turning, -(o2 - o1) * turning];
    const facing: V3 = [out[0] * no, away[1] * nw, out[2] * no];
    const [p, q, t, u] = [
      point(o1, w1, ends[0]),
      point(o2, w2, ends[0]),
      point(o2, w2, ends[1]),
      point(o1, w1, ends[1]),
    ];
    triangle(p, q, t, facing);
    triangle(p, t, u, facing);
  }
  // The two ends, as fans from the corner of the section that lies outside the body.
  for (const [t, way] of [
    [ends[0], -1],
    [ends[1], 1],
  ]) {
    for (let k = 1; k + 1 < count; k += 1) {
      triangle(
        point(section[0][0], section[0][1], t),
        point(section[k][0], section[k][1], t),
        point(section[k + 1][0], section[k + 1][1], t),
        [along[0] * way, 0, along[2] * way],
      );
    }
  }
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
