// Facets: a body of flat faces between points in space, as a folded sheet is. The faces are written by the points they
// run round, with the outside on the left of the way they run. The sheet can be mirrored into its other half, given a
// thickness, and every edge of it a narrow band that turns from one face to the next, so the edges catch the light.
type V3 = [number, number, number];

export interface FacetsShape {
  points: V3[];
  // Each face as the points it runs round, by their place in `points`.
  faces: number[][];
  // The other half, mirrored in the plane across this axis. Points on that plane belong to both halves.
  symmetry?: 'x' | 'y' | 'z';
  // How thick the sheet is, measured inwards from the faces as written.
  thickness?: number;
  // How wide the band along each edge is.
  bevel?: number;
}

export interface FacetsGeometry {
  positions: Float32Array;
  normals: Float32Array;
}

interface Sheet {
  points: V3[];
  faces: number[][];
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const times = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: V3): V3 => {
  const length = Math.hypot(a[0], a[1], a[2]);
  return length > 1e-12 ? [a[0] / length, a[1] / length, a[2] / length] : [0, 0, 0];
};

// The way a face looks, from all its points, so one that is not quite flat still has one.
function normalOf(points: V3[], face: number[]): V3 {
  const n: V3 = [0, 0, 0];
  for (let i = 0; i < face.length; i += 1) {
    const [p, q] = [points[face[i]], points[face[(i + 1) % face.length]]];
    n[0] += (p[1] - q[1]) * (p[2] + q[2]);
    n[1] += (p[2] - q[2]) * (p[0] + q[0]);
    n[2] += (p[0] - q[0]) * (p[1] + q[1]);
  }
  return unit(n);
}

function whole(sheet: Sheet): Sheet {
  const count = sheet.points.length;
  const faces = sheet.faces
    .map(face =>
      face.filter((at, i) => Number.isInteger(at) && at >= 0 && at < count && at !== face[(i + 1) % face.length]),
    )
    .filter(face => face.length >= 3);
  return { points: sheet.points, faces };
}

function withOtherHalf(sheet: Sheet, axis: number): Sheet {
  const points = [...sheet.points];
  const twin = sheet.points.map((point, i) => {
    if (Math.abs(point[axis]) < 1e-6) {
      return i;
    }
    const mirrored: V3 = [point[0], point[1], point[2]];
    mirrored[axis] = -mirrored[axis];
    points.push(mirrored);
    return points.length - 1;
  });
  const faces = [...sheet.faces, ...sheet.faces.map(face => face.map(at => twin[at]).reverse())];
  return { points, faces };
}

const key = (a: number, b: number) => a * 1048576 + b;

// The sheet with a thickness: its faces, the same faces set in and turned over, and a rim round every open edge.
function thick(sheet: Sheet, thickness: number): Sheet {
  const count = sheet.points.length;
  const normals = sheet.faces.map(face => normalOf(sheet.points, face));
  const around: V3[][] = sheet.points.map(() => []);
  sheet.faces.forEach((face, f) => {
    for (const at of face) {
      around[at].push(normals[f]);
    }
  });
  const inner = sheet.points.map((point, i) => {
    const way = unit(around[i].reduce<V3>((sum, n) => add(sum, n), [0, 0, 0]));
    // Set in so far that the faces are the thickness apart, not the points.
    const least = Math.min(1, ...around[i].map(n => dot(way, n)));
    return sub(point, times(way, thickness / Math.max(0.35, least)));
  });
  const taken = new Set<number>();
  for (const face of sheet.faces) {
    face.forEach((a, i) => {
      taken.add(key(a, face[(i + 1) % face.length]));
    });
  }
  const faces = [...sheet.faces, ...sheet.faces.map(face => face.map(at => at + count).reverse())];
  for (const face of sheet.faces) {
    face.forEach((a, i) => {
      const b = face[(i + 1) % face.length];
      if (!taken.has(key(b, a))) {
        faces.push([b, a, a + count, b + count]);
      }
    });
  }
  return { points: [...sheet.points, ...inner], faces };
}

// Triangles of a face that may bend inwards, by cutting ears off it as it lies in its own plane.
function ears(corners: V3[], normal: V3): Array<[number, number, number]> {
  const rest = corners.map((_, i) => i);
  const triangles: Array<[number, number, number]> = [];
  const turns = (a: number, b: number, c: number) =>
    dot(cross(sub(corners[b], corners[a]), sub(corners[c], corners[b])), normal);
  let guard = corners.length * corners.length + 8;
  while (rest.length > 3 && guard > 0) {
    guard -= 1;
    let cut = false;
    for (let i = 0; i < rest.length; i += 1) {
      const [a, b, c] = [rest[(i + rest.length - 1) % rest.length], rest[i], rest[(i + 1) % rest.length]];
      if (turns(a, b, c) <= 1e-14) {
        continue;
      }
      const blocked = rest.some(
        p => p !== a && p !== b && p !== c && turns(a, b, p) > 0 && turns(b, c, p) > 0 && turns(c, a, p) > 0,
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
      rest.splice(0, 1);
    }
  }
  if (rest.length === 3) {
    triangles.push([rest[0], rest[1], rest[2]]);
  }
  return triangles;
}

export function buildFacets(shape: FacetsShape): FacetsGeometry {
  let sheet = whole({ points: shape.points, faces: shape.faces });
  if (shape.symmetry) {
    sheet = withOtherHalf(sheet, shape.symmetry === 'x' ? 0 : shape.symmetry === 'y' ? 1 : 2);
  }
  if (shape.thickness && shape.thickness > 0) {
    sheet = thick(sheet, shape.thickness);
  }
  const { points, faces } = sheet;
  const normals = faces.map(face => normalOf(points, face));
  const wanted = Math.max(0, shape.bevel ?? 0);

  // Each face drawn in from its edges by the band, so every corner of every face has a point of its own.
  const drawn = faces.map((face, f) => {
    const corners = face.map(at => points[at]);
    const n = normals[f];
    const shortest = Math.min(...corners.map((p, i) => Math.hypot(...sub(corners[(i + 1) % corners.length], p))));
    // No wider than a slim face holds: a part of how far its middle lies from its edges.
    const round = corners.reduce((sum, p, i) => sum + Math.hypot(...sub(corners[(i + 1) % corners.length], p)), 0);
    const area =
      Math.hypot(
        ...corners.reduce<V3>((sum, p, i) => add(sum, cross(p, corners[(i + 1) % corners.length])), [0, 0, 0]),
      ) / 2;
    let band = Math.min(wanted, shortest * 0.3, round > 0 ? ((2 * area) / round) * 0.35 : 0);
    // A face that runs to a point takes less still: its band is halved until none of its edges has turned round.
    for (let step = 0; step < 6 && band > 1e-6; step += 1) {
      const width = band;
      const inside = corners.map((point, i) => {
        const before = corners[(i + corners.length - 1) % corners.length];
        const after = corners[(i + 1) % corners.length];
        const [in1, in2] = [cross(n, unit(sub(point, before))), cross(n, unit(sub(after, point)))];
        const reach = 1 / Math.max(0.25, 1 + dot(in1, in2));
        return add(point, times(add(in1, in2), width * reach));
      });
      const kept = corners.every((point, i) => {
        const j = (i + 1) % corners.length;
        const [was, now] = [sub(corners[j], point), sub(inside[j], inside[i])];
        return dot(was, now) > dot(was, was) * 0.05;
      });
      if (kept) {
        return inside;
      }
      band /= 2;
    }
    return corners;
  });

  const positions: number[] = [];
  const facing: number[] = [];
  const triangle = (a: V3, b: V3, c: V3, na: V3, nb: V3, nc: V3) => {
    const size = cross(sub(b, a), sub(c, a));
    if (Math.hypot(size[0], size[1], size[2]) < 1e-12) {
      return;
    }
    positions.push(...a, ...b, ...c);
    facing.push(...na, ...nb, ...nc);
  };

  faces.forEach((_, f) => {
    for (const [a, b, c] of ears(drawn[f], normals[f])) {
      triangle(drawn[f][a], drawn[f][b], drawn[f][c], normals[f], normals[f], normals[f]);
    }
  });
  if (wanted <= 0) {
    return { positions: new Float32Array(positions), normals: new Float32Array(facing) };
  }

  // Where each edge is, by the face that runs along it and the corner it starts at.
  const edges = new Map<number, [number, number]>();
  faces.forEach((face, f) => {
    face.forEach((a, i) => {
      edges.set(key(a, face[(i + 1) % face.length]), [f, i]);
    });
  });

  // A band along every edge, from the one face to the other, facing as each of them does at its side.
  faces.forEach((face, f) => {
    face.forEach((a, i) => {
      const j = (i + 1) % face.length;
      const b = face[j];
      const other = edges.get(key(b, a));
      if (!other || a > b) {
        return;
      }
      const [g, k] = other;
      const l = (k + 1) % faces[g].length;
      const [fb, fa, ga, gb] = [drawn[f][j], drawn[f][i], drawn[g][l], drawn[g][k]];
      triangle(fb, fa, ga, normals[f], normals[f], normals[g]);
      triangle(fb, ga, gb, normals[f], normals[g], normals[g]);
    });
  });

  // A patch at every point, between the corners of the faces that meet there.
  const done = new Set<number>();
  faces.forEach((face, f) => {
    face.forEach((at, i) => {
      if (done.has(at)) {
        return;
      }
      done.add(at);
      const ring: Array<[number, number]> = [];
      let [g, k] = [f, i];
      for (let guard = 0; guard < 64; guard += 1) {
        ring.push([g, k]);
        const next = edges.get(key(faces[g][(k + 1) % faces[g].length], at));
        if (!next) {
          return;
        }
        [g, k] = [next[0], (next[1] + 1) % faces[next[0]].length];
        if (g === f && k === i) {
          break;
        }
      }
      if (ring.length < 3) {
        return;
      }
      const corners = ring.map(([face, corner]) => drawn[face][corner]);
      const ways = ring.map(([face]) => normals[face]);
      const mean = unit(ways.reduce<V3>((sum, n) => add(sum, n), [0, 0, 0]));
      const middle = times(
        corners.reduce<V3>((sum, p) => add(sum, p), [0, 0, 0]),
        1 / corners.length,
      );
      for (let c = 0; c < corners.length; c += 1) {
        const d = (c + 1) % corners.length;
        const out = dot(cross(sub(corners[c], middle), sub(corners[d], middle)), mean) >= 0;
        if (out) {
          triangle(middle, corners[c], corners[d], mean, ways[c], ways[d]);
        } else {
          triangle(middle, corners[d], corners[c], mean, ways[d], ways[c]);
        }
      }
    });
  });
  return { positions: new Float32Array(positions), normals: new Float32Array(facing) };
}

export const FACETS_ASSET = 'facets:';

export const facetsAssetName = (shape: FacetsShape): string => FACETS_ASSET + JSON.stringify(shape);

export function facetsOfAsset(asset: string): FacetsShape | undefined {
  if (!asset.startsWith(FACETS_ASSET)) {
    return undefined;
  }
  try {
    return JSON.parse(asset.slice(FACETS_ASSET.length)) as FacetsShape;
  } catch {
    return undefined;
  }
}
