import type { MeshPrimitive } from './glb';

// Where two faces meet at more than this angle, the edge is drawn. A rounding is made of many small steps below it, so only
// where it starts and ends shows, as a line.
const CREASE_DEGREES = 28;

const cache = new WeakMap<MeshPrimitive, Float32Array>();

// The edges of a part that are seen as edges: where two faces meet at an angle, and where a face has no neighbour. Two points
// for each, six numbers, in the coordinates of the part.
export function featureEdges(primitive: MeshPrimitive): Float32Array {
  const known = cache.get(primitive);
  if (known) {
    return known;
  }
  const { positions, indices } = primitive;
  const count = indices ? indices.length : positions.length / 3;
  const corner = (i: number) => (indices ? indices[i] : i);
  // Corners at one place are one point, however the file has them.
  const ids = new Map<string, number>();
  const point = (v: number) => {
    const key = `${Math.round(positions[v * 3] * 1e5)},${Math.round(positions[v * 3 + 1] * 1e5)},${Math.round(positions[v * 3 + 2] * 1e5)}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = ids.size;
      ids.set(key, id);
    }
    return id;
  };
  const edges = new Map<string, { a: number; b: number; normals: number[][] }>();
  for (let t = 0; t + 2 < count; t += 3) {
    const v = [corner(t), corner(t + 1), corner(t + 2)];
    const p = v.map(i => [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]]);
    const u = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]];
    const w = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const length = Math.hypot(n[0], n[1], n[2]);
    if (length < 1e-12) {
      continue;
    }
    const normal = [n[0] / length, n[1] / length, n[2] / length];
    const at = v.map(point);
    for (let k = 0; k < 3; k++) {
      const [x, y] = [at[k], at[(k + 1) % 3]];
      if (x === y) {
        continue;
      }
      const key = x < y ? `${x}:${y}` : `${y}:${x}`;
      const edge = edges.get(key) ?? { a: v[k], b: v[(k + 1) % 3], normals: [] };
      edge.normals.push(normal);
      edges.set(key, edge);
    }
  }
  const crease = Math.cos((CREASE_DEGREES * Math.PI) / 180);
  const all = [...edges.values()];
  const at = (v: number) => [positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]];
  const facing = (m: number[], n: number[]) => m[0] * n[0] + m[1] * n[1] + m[2] * n[2] >= crease;
  // A model cut by others has edges that end in the middle of a longer one on the other side. Such an edge has one face, and is
  // only an edge when the face of that longer one turns away from it.
  const across = (edge: { a: number; b: number }, normal: number[]): boolean => {
    const [p, q] = [at(edge.a), at(edge.b)];
    const middle = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
    for (const other of all) {
      if (other === edge) {
        continue;
      }
      const [c, e] = [at(other.a), at(other.b)];
      const d = [e[0] - c[0], e[1] - c[1], e[2] - c[2]];
      const length = Math.hypot(d[0], d[1], d[2]);
      if (length < 1e-9) {
        continue;
      }
      const w = [middle[0] - c[0], middle[1] - c[1], middle[2] - c[2]];
      const t = (w[0] * d[0] + w[1] * d[1] + w[2] * d[2]) / (length * length);
      if (t <= 1e-6 || t >= 1 - 1e-6) {
        continue;
      }
      const off = Math.hypot(w[1] * d[2] - w[2] * d[1], w[2] * d[0] - w[0] * d[2], w[0] * d[1] - w[1] * d[0]) / length;
      if (off > length * 1e-5 + 1e-6) {
        continue;
      }
      if (other.normals.some(n => facing(n, normal))) {
        return false;
      }
    }
    return true;
  };
  const out: number[] = [];
  for (const edge of all) {
    const { a, b, normals } = edge;
    // Faces split along a flat stretch show no edge. A face without a neighbour does, and so does a fold.
    let sharp = normals.length === 1 ? across(edge, normals[0]) : false;
    for (let i = 1; i < normals.length && !sharp; i++) {
      sharp = !facing(normals[0], normals[i]);
    }
    if (sharp) {
      out.push(...at(a), ...at(b));
    }
  }
  const result = new Float32Array(out);
  cache.set(primitive, result);
  return result;
}
