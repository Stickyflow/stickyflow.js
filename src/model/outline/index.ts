// Outlines with holes, and adding one to another or cutting one out of another. An outline is a set of rings, each a
// closed line of straight edges. A point is inside when it lies in an odd number of them.

export type Ring = Array<[number, number]>;
export type Outline = Ring[];
export type OutlineOperation = 'add' | 'cut' | 'keep';

const TINY = 1e-9;
const key = (x: number, y: number) => `${Math.round(x * 1e7)},${Math.round(y * 1e7)}`;

export function ringArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

export function insideOutline(outline: Outline, x: number, y: number): boolean {
  let inside = false;
  for (const ring of outline) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [ax, ay] = ring[i];
      const [bx, by] = ring[j];
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) {
        inside = !inside;
      }
    }
  }
  return inside;
}

interface Edge {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

const edgesOf = (outline: Outline): Edge[] =>
  outline.flatMap(ring =>
    ring.map(([ax, ay], i) => {
      const [bx, by] = ring[(i + 1) % ring.length];
      return { ax, ay, bx, by };
    }),
  );

// Where along an edge the edges of the other outline meet it, from 0 to 1.
function cutsAlong(edge: Edge, others: readonly Edge[]): number[] {
  const cuts: number[] = [];
  const [dx, dy] = [edge.bx - edge.ax, edge.by - edge.ay];
  const length = dx * dx + dy * dy;
  for (const other of others) {
    const [ex, ey] = [other.bx - other.ax, other.by - other.ay];
    const cross = dx * ey - dy * ex;
    if (Math.abs(cross) < TINY) {
      // Two edges on one line: the ends of the other one divide this one.
      if (Math.abs((other.ax - edge.ax) * dy - (other.ay - edge.ay) * dx) > TINY) {
        continue;
      }
      for (const [px, py] of [
        [other.ax, other.ay],
        [other.bx, other.by],
      ]) {
        cuts.push(((px - edge.ax) * dx + (py - edge.ay) * dy) / length);
      }
      continue;
    }
    const t = ((other.ax - edge.ax) * ey - (other.ay - edge.ay) * ex) / cross;
    const u = ((other.ax - edge.ax) * dy - (other.ay - edge.ay) * dx) / cross;
    if (u > -1e-7 && u < 1 + 1e-7) {
      cuts.push(t);
    }
  }
  return cuts.filter(t => t > 1e-7 && t < 1 - 1e-7).sort((a, b) => a - b);
}

function pieces(edges: readonly Edge[], others: readonly Edge[]): Edge[] {
  return edges.flatMap(edge => {
    const stops = [0, ...cutsAlong(edge, others), 1];
    const at = (t: number): [number, number] => [edge.ax + (edge.bx - edge.ax) * t, edge.ay + (edge.by - edge.ay) * t];
    const parts: Edge[] = [];
    for (let i = 0; i + 1 < stops.length; i += 1) {
      if (stops[i + 1] - stops[i] < 1e-7) {
        continue;
      }
      const [ax, ay] = at(stops[i]);
      const [bx, by] = at(stops[i + 1]);
      parts.push({ ax, ay, bx, by });
    }
    return parts;
  });
}

// The outline of two outlines joined by an operation. Its rings run with the inside on their left, so a ring round a
// hole runs the other way than the ring round the body.
export function combineOutlines(first: Outline, second: Outline, operation: OutlineOperation): Outline {
  const within = (x: number, y: number): boolean => {
    const a = insideOutline(first, x, y);
    const b = insideOutline(second, x, y);
    return operation === 'add' ? a || b : operation === 'cut' ? a && !b : a && b;
  };
  const [edgesA, edgesB] = [edgesOf(first), edgesOf(second)];
  const kept = new Map<string, Edge>();
  for (const edge of [...pieces(edgesA, edgesB), ...pieces(edgesB, edgesA)]) {
    const [dx, dy] = [edge.bx - edge.ax, edge.by - edge.ay];
    const length = Math.hypot(dx, dy);
    if (length < 1e-7) {
      continue;
    }
    const [mx, my] = [(edge.ax + edge.bx) / 2, (edge.ay + edge.by) / 2];
    const step = Math.min(1e-5, length / 4);
    const [nx, ny] = [(-dy / length) * step, (dx / length) * step];
    const left = within(mx + nx, my + ny);
    const right = within(mx - nx, my - ny);
    if (left === right) {
      continue;
    }
    const directed = left ? edge : { ax: edge.bx, ay: edge.by, bx: edge.ax, by: edge.ay };
    kept.set(`${key(directed.ax, directed.ay)}>${key(directed.bx, directed.by)}`, directed);
  }

  const from = new Map<string, Edge[]>();
  for (const edge of kept.values()) {
    const start = key(edge.ax, edge.ay);
    from.set(start, [...(from.get(start) ?? []), edge]);
  }
  const rings: Outline = [];
  for (const start of [...from.keys()]) {
    for (;;) {
      const ring: Ring = [];
      let at = start;
      for (let guard = 0; guard < 100_000; guard += 1) {
        const edge = from.get(at)?.pop();
        if (!edge) {
          break;
        }
        ring.push([edge.ax, edge.ay]);
        at = key(edge.bx, edge.by);
        if (at === start) {
          break;
        }
      }
      if (ring.length === 0) {
        break;
      }
      if (ring.length >= 3 && at === start && Math.abs(ringArea(ring)) > 1e-10) {
        rings.push(withoutStraightPoints(ring));
      }
    }
  }
  return rings.filter(ring => ring.length >= 3);
}

// A point on the straight line between its neighbours says nothing, and is left out.
function withoutStraightPoints(ring: Ring): Ring {
  return ring.filter((point, i) => {
    const before = ring[(i + ring.length - 1) % ring.length];
    const after = ring[(i + 1) % ring.length];
    return (
      Math.abs((point[0] - before[0]) * (after[1] - before[1]) - (point[1] - before[1]) * (after[0] - before[0])) > 1e-9
    );
  });
}
