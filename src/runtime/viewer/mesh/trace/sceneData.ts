import { type Mat4, normalMatrix, transformPoint } from '../matrix';
import { buildBvh } from './bvh';

// The pictures of a material that the tracer reads, with their sizes.
export type TraceMapName = 'base' | 'emissive' | 'surface' | 'normal';

export interface TraceMap {
  texture: WebGLTexture;
  width: number;
  height: number;
}

// One part of one mesh, at its place in the world, with the material it is drawn with.
export interface TracePart {
  world: Mat4;
  positions: Float32Array;
  normals: Float32Array;
  uvs?: Float32Array;
  indices?: ArrayLike<number>;
  base: readonly [number, number, number, number];
  metallic: number;
  roughness: number;
  emissive: readonly [number, number, number];
  normalScale: number;
  maps: Partial<Record<TraceMapName, TraceMap>>;
}

// What the tracer needs of a scene, as rows of numbers for textures.
export interface SceneData {
  // Eight numbers per node of the tree.
  nodes: Float32Array;
  // 28 numbers per triangle, in the order of the leaves: three corners, each followed by the material, the first u and the first
  // v; three normals, each followed by one more of the uvs; then the last v.
  triangles: Float32Array;
  // 12 numbers per part: the color, then metallic, roughness, the layer of its pictures and the scale of its normal map, then
  // what it emits and which pictures it has, as a sum of 1 for the color, 2 for the surface, 4 for the normals and 8 for the glow.
  materials: Float32Array;
  // The parts that have pictures, in the order of their layers.
  textured: TracePart[];
}

export const TRIANGLE_SIZE = 28;

export function buildSceneData(parts: readonly TracePart[]): SceneData {
  const count = parts.reduce(
    (sum, part) => sum + (part.indices ? part.indices.length : part.positions.length / 3) / 3,
    0,
  );
  const corners = new Float32Array(count * 9);
  const rest = new Float32Array(count * 16);
  const materials = new Float32Array(parts.length * 12);
  const textured: TracePart[] = [];
  let triangle = 0;
  parts.forEach((part, material) => {
    const hasMaps = Object.keys(part.maps).length > 0;
    const flags =
      (part.maps.base ? 1 : 0) +
      (part.maps.surface ? 2 : 0) +
      (part.maps.normal ? 4 : 0) +
      (part.maps.emissive ? 8 : 0);
    materials.set(
      [
        ...part.base,
        part.metallic,
        part.roughness,
        hasMaps ? textured.length : -1,
        part.normalScale,
        ...part.emissive,
        flags,
      ],
      material * 12,
    );
    if (hasMaps) {
      textured.push(part);
    }
    const turn = normalMatrix(part.world);
    const vertices = part.indices ? part.indices.length : part.positions.length / 3;
    for (let i = 0; i < vertices; i += 3, triangle++) {
      for (let corner = 0; corner < 3; corner++) {
        const vertex = part.indices ? part.indices[i + corner] : i + corner;
        corners.set(transformPoint(part.world, part.positions, vertex * 3), triangle * 9 + corner * 3);
        const [nx, ny, nz] = [part.normals[vertex * 3], part.normals[vertex * 3 + 1], part.normals[vertex * 3 + 2]];
        const normal = [
          turn[0] * nx + turn[3] * ny + turn[6] * nz,
          turn[1] * nx + turn[4] * ny + turn[7] * nz,
          turn[2] * nx + turn[5] * ny + turn[8] * nz,
        ];
        const length = Math.hypot(normal[0], normal[1], normal[2]) || 1;
        const at = triangle * 16 + corner * 5;
        rest[at] = normal[0] / length;
        rest[at + 1] = normal[1] / length;
        rest[at + 2] = normal[2] / length;
        rest[at + 3] = part.uvs ? part.uvs[vertex * 2] : 0;
        rest[at + 4] = part.uvs ? part.uvs[vertex * 2 + 1] : 0;
      }
      rest[triangle * 16 + 15] = material;
    }
  });

  const { nodes, order } = buildBvh(corners);
  const triangles = new Float32Array(count * TRIANGLE_SIZE);
  order.forEach((from, to) => {
    const c = from * 9;
    const r = from * 16;
    const uv = (corner: number, part: number) => rest[r + corner * 5 + 3 + part];
    triangles.set(
      [
        ...corners.subarray(c, c + 3),
        rest[r + 15],
        ...corners.subarray(c + 3, c + 6),
        uv(0, 0),
        ...corners.subarray(c + 6, c + 9),
        uv(0, 1),
        ...rest.subarray(r, r + 3),
        uv(1, 0),
        ...rest.subarray(r + 5, r + 8),
        uv(1, 1),
        ...rest.subarray(r + 10, r + 13),
        uv(2, 0),
        uv(2, 1),
        0,
        0,
        0,
      ],
      to * TRIANGLE_SIZE,
    );
  });
  return { nodes, triangles, materials, textured };
}
