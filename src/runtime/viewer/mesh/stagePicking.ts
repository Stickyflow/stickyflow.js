import { type Camera, planeHit } from './camera';
import type { MeshObjectPoint, MeshObjectQuery } from './stageTypes';
import { type StageSurface, surfaceMatrix } from './surfaceTextures';

// A surface under a point, how far away it is, and where on it the point lies, from 0 to 1.
export interface SurfaceHit {
  surface: StageSurface;
  distance: number;
  x: number;
  y: number;
}

// What lies on top at a point of a surface, in its units.
export const topmostAt = (surface: StageSurface, x: number, y: number) =>
  surface.members
    .filter(item => x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height)
    .pop();

// The nearest surface under a point of the stage, unless a mesh stands in front of it.
export function surfaceUnder(
  camera: Camera,
  surfaces: readonly StageSurface[],
  [x, y]: readonly [number, number],
  meshDistance: () => number | undefined,
): SurfaceHit | undefined {
  let nearest: SurfaceHit | undefined;
  for (const surface of surfaces) {
    const hit = planeHit(camera, surfaceMatrix(surface), x, y);
    const inside = hit && hit.x >= 0 && hit.x <= 1 && hit.y >= 0 && hit.y <= 1;
    if (hit && inside && (!nearest || hit.distance < nearest.distance)) {
      nearest = { surface, distance: hit.distance, x: hit.x, y: hit.y };
    }
  }
  if (!nearest) {
    return undefined;
  }
  const mesh = meshDistance();
  return mesh !== undefined && mesh < nearest.distance ? undefined : nearest;
}

// A point of the stage on the plane of a surface, in its units, also beyond its edges.
export function surfacePoint(
  camera: Camera | undefined,
  surface: StageSurface,
  [x, y]: readonly [number, number],
): { x: number; y: number } | undefined {
  const hit = camera && planeHit(camera, surfaceMatrix(surface), x, y);
  return hit ? { x: hit.x * surface.width, y: hit.y * surface.height } : undefined;
}

// What lies on a Canvas under the pointer, and where on it the pointer is. With `holding`, where the pointer is on that one
// object, kept within it.
export function objectUnder(
  camera: Camera | undefined,
  surfaces: readonly StageSurface[],
  point: readonly [number, number],
  options: MeshObjectQuery,
  under: () => SurfaceHit | undefined,
): MeshObjectPoint | null {
  if (options.holding) {
    const { holding } = options;
    const surface = surfaces.find(item => item.members.some(member => member.id === holding));
    const member = surface?.members.find(item => item.id === holding);
    const at = surface && surfacePoint(camera, surface, point);
    if (!member || !at) {
      return null;
    }
    const within = (value: number) => Math.min(1, Math.max(0, value));
    return {
      id: member.id,
      x: within((at.x - member.x) / member.width),
      y: within((at.y - member.y) / member.height),
    };
  }
  const found = under();
  if (!found) {
    return null;
  }
  const px = found.x * found.surface.width;
  const py = found.y * found.surface.height;
  const members = options.among
    ? { ...found.surface, members: found.surface.members.filter(item => options.among?.has(item.id)) }
    : found.surface;
  const member = topmostAt(members, px, py);
  return member ? { id: member.id, x: (px - member.x) / member.width, y: (py - member.y) / member.height } : null;
}
