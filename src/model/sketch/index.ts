import { type Outline, type Ring, ringArea } from '../outline';

type Point = [number, number];

const ROUND_STEPS = 8;
const CIRCLE_STEPS = 32;

function unit(x: number, y: number): [number, number, number] {
  const length = Math.hypot(x, y) || 1;
  return [x / length, y / length, length];
}

export function circleRing(at: Point, radius: number): Ring {
  return Array.from({ length: CIRCLE_STEPS }, (_, i): Point => {
    const angle = (i / CIRCLE_STEPS) * Math.PI * 2;
    return [at[0] + Math.cos(angle) * radius, at[1] + Math.sin(angle) * radius];
  });
}

// A ring with its corners rounded. A radius is no larger than the two edges at its corner allow.
export function roundedRing(points: Ring, radii: readonly number[]): Ring {
  const out: Ring = [];
  points.forEach((corner, i) => {
    const radius = radii[i] ?? 0;
    const before = points[(i + points.length - 1) % points.length];
    const after = points[(i + 1) % points.length];
    const [ux, uy, lu] = unit(before[0] - corner[0], before[1] - corner[1]);
    const [wx, wy, lw] = unit(after[0] - corner[0], after[1] - corner[1]);
    const half = Math.acos(Math.max(-1, Math.min(1, ux * wx + uy * wy))) / 2;
    if (radius <= 0 || half < 0.02 || half > Math.PI / 2 - 0.02) {
      out.push(corner);
      return;
    }
    const reach = Math.min(radius / Math.tan(half), lu / 2, lw / 2);
    const r = reach * Math.tan(half);
    const [bx, by] = unit(ux + wx, uy + wy);
    const centre: Point = [corner[0] + (bx * r) / Math.sin(half), corner[1] + (by * r) / Math.sin(half)];
    const from: Point = [corner[0] + ux * reach, corner[1] + uy * reach];
    const to: Point = [corner[0] + wx * reach, corner[1] + wy * reach];
    const start = Math.atan2(from[1] - centre[1], from[0] - centre[0]);
    let sweep = Math.atan2(to[1] - centre[1], to[0] - centre[0]) - start;
    if (sweep > Math.PI) {
      sweep -= Math.PI * 2;
    }
    if (sweep < -Math.PI) {
      sweep += Math.PI * 2;
    }
    for (let step = 0; step <= ROUND_STEPS; step++) {
      const angle = start + (sweep * step) / ROUND_STEPS;
      out.push([centre[0] + Math.cos(angle) * r, centre[1] + Math.sin(angle) * r]);
    }
  });
  return out;
}

function inside(ring: Ring, [x, y]: Point): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [a, b] = [ring[i], ring[j]];
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) {
      hit = !hit;
    }
  }
  return hit;
}

// Where shapes lie over each other they cut each other into pieces. A piece is known by the shapes it lies in, one bit each.
const pieceAt = (shapes: readonly Ring[], at: Point): number =>
  shapes.reduce((piece, shape, i) => (inside(shape, at) ? piece | (1 << i) : piece), 0);

const keyOf = (p: Point): string => `${Math.round(p[0] * 1e5)},${Math.round(p[1] * 1e5)}`;

// The outline of the pieces of a sketch that are picked, each by a point in it, taken together: the rings round them and, running
// the other way, the holes in them. Without picks it is all the shapes together.
export function pickedOutline(shapes: readonly Ring[], picks?: readonly Point[]): Outline {
  const picked = new Set<number>();
  if (picks && picks.length > 0) {
    for (const pick of picks) {
      const piece = pieceAt(shapes, pick);
      if (piece) {
        picked.add(piece);
      }
    }
  } else {
    for (let piece = 1; piece < 1 << shapes.length; piece++) {
      picked.add(piece);
    }
  }
  const edges = shapes
    .flatMap(shape => shape.map((a, i): [Point, Point] => [a, shape[(i + 1) % shape.length]]))
    .filter(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]) > 1e-9);
  // Every edge is cut where another one crosses or ends on it. A piece of an edge is part of the outline when what is picked
  // lies on one side of it only, and it is turned so that lies on its left.
  const pieces: Array<[Point, Point]> = [];
  const seen = new Set<string>();
  for (const edge of edges) {
    const [a, b] = edge;
    const d: Point = [b[0] - a[0], b[1] - a[1]];
    const length = Math.hypot(d[0], d[1]);
    const cuts = [0, 1];
    for (const other of edges) {
      if (other === edge) {
        continue;
      }
      const [c, e] = other;
      const f: Point = [e[0] - c[0], e[1] - c[1]];
      const cross = d[0] * f[1] - d[1] * f[0];
      if (Math.abs(cross) > 1e-12) {
        const t = ((c[0] - a[0]) * f[1] - (c[1] - a[1]) * f[0]) / cross;
        const u = ((c[0] - a[0]) * d[1] - (c[1] - a[1]) * d[0]) / cross;
        if (t > 1e-9 && t < 1 - 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) {
          cuts.push(t);
        }
        continue;
      }
      for (const p of [c, e]) {
        const t = ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / (length * length);
        const off = Math.abs((p[0] - a[0]) * d[1] - (p[1] - a[1]) * d[0]) / length;
        if (off < 1e-7 && t > 1e-9 && t < 1 - 1e-9) {
          cuts.push(t);
        }
      }
    }
    cuts.sort((x, y) => x - y);
    const left: Point = [(-d[1] / length) * 1e-4, (d[0] / length) * 1e-4];
    for (let i = 0; i + 1 < cuts.length; i++) {
      const [t0, t1] = [cuts[i], cuts[i + 1]];
      if (t1 - t0 < 1e-9) {
        continue;
      }
      const p: Point = [a[0] + d[0] * t0, a[1] + d[1] * t0];
      const q: Point = [a[0] + d[0] * t1, a[1] + d[1] * t1];
      const middle: Point = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const onLeft = picked.has(pieceAt(shapes, [middle[0] + left[0], middle[1] + left[1]]));
      const onRight = picked.has(pieceAt(shapes, [middle[0] - left[0], middle[1] - left[1]]));
      if (onLeft === onRight) {
        continue;
      }
      const piece: [Point, Point] = onLeft ? [p, q] : [q, p];
      const key = `${keyOf(piece[0])}>${keyOf(piece[1])}`;
      if (!seen.has(key)) {
        seen.add(key);
        pieces.push(piece);
      }
    }
  }

  const from = new Map<string, Array<[Point, Point]>>();
  for (const piece of pieces) {
    from.set(keyOf(piece[0]), [...(from.get(keyOf(piece[0])) ?? []), piece]);
  }
  const used = new Set<[Point, Point]>();
  const outline: Outline = [];
  for (const first of pieces) {
    if (used.has(first)) {
      continue;
    }
    const ring: Ring = [];
    let now = first;
    for (let guard = 0; guard <= pieces.length; guard++) {
      used.add(now);
      ring.push(now[0]);
      if (keyOf(now[1]) === keyOf(first[0])) {
        break;
      }
      const way: Point = [now[1][0] - now[0][0], now[1][1] - now[0][1]];
      // Where rings touch in a point, the one that turns furthest to the left is the same ring.
      let next: [Point, Point] | undefined;
      let most = -Infinity;
      for (const candidate of from.get(keyOf(now[1])) ?? []) {
        if (used.has(candidate)) {
          continue;
        }
        const to: Point = [candidate[1][0] - candidate[0][0], candidate[1][1] - candidate[0][1]];
        const turn = Math.atan2(way[0] * to[1] - way[1] * to[0], way[0] * to[0] + way[1] * to[1]);
        if (turn > most) {
          most = turn;
          next = candidate;
        }
      }
      if (!next) {
        break;
      }
      now = next;
    }
    // A point in the middle of a straight run says nothing.
    const plain = ring.filter((p, i) => {
      const [before, after] = [ring[(i + ring.length - 1) % ring.length], ring[(i + 1) % ring.length]];
      return Math.abs((p[0] - before[0]) * (after[1] - p[1]) - (p[1] - before[1]) * (after[0] - p[0])) > 1e-9;
    });
    if (plain.length >= 3 && Math.abs(ringArea(plain)) > 1e-8) {
      outline.push(plain);
    }
  }
  return outline.sort((x, y) => Math.abs(ringArea(y)) - Math.abs(ringArea(x)));
}
