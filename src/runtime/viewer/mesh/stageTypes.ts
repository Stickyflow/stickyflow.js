import type { Mesh, MeshAnchor, MeshGround, MeshLight, Vec3 } from '../../../model/mesh';
import type { MeshObjectBox } from './handles';
import type { StageSurface } from './surfaceTextures';

export const MESH_STAGE_ATTR = 'data-sf-mesh-stage';
export const MESH_HANDLES_ATTR = 'data-sf-mesh-handles';

export interface MeshHandleChange {
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
}

export interface MeshStageEvents {
  select(id: string | null): void;
  change(id: string, change: MeshHandleChange): void;
  objectSelect(id: string | null): void;
  objectChange(id: string, box: MeshObjectBox): void;
  error(message: string): void;
}

export interface MeshStageOptions {
  interactive: boolean;
  // Says what address an asset is loaded from, or that it is not loaded at all.
  resolveAsset?: (asset: string) => string | null;
  events: MeshStageEvents;
}

export interface MeshStageFlags {
  hidden: readonly string[];
  locked: readonly string[];
}

// Where the camera of a Scene looks from and at. `orbit` is the side it looks from, as `orbit` on a Scene: the turn round the
// Scene and the height above it, in degrees. `target` is the point of the world in the middle of the picture.
export interface MeshCamera {
  orbit: [number, number];
  target: { x: number; y: number; z: number };
}

export interface MeshStagesHandle {
  // The pictures of the stages in the order of the document, for exports.
  capture(): Array<string | undefined>;
  refresh(): void;
  setValue(meshId: string, property: string, value: number | string): boolean;
  clearValues(): void;
  setEditing(editing: boolean): void;
  setGrid(grid: boolean): void;
  setDirectCamera(direct: boolean): void;
  setSteadyCamera(steady: boolean): void;
  setTracing(tracing: boolean): void;
  setPlainShadows(on: boolean): void;
  // What the layers of a host have hidden or locked, by name.
  setFlags(flags: MeshStageFlags): void;
  // The meshes that move together: dragging one of them takes the others along, by the same step.
  setFollowers(ids: readonly string[]): void;
  // Selects a mesh, a Canvas or what lies on one, from outside the stage. False when no stage knows the name.
  selectItem(id: string | null): boolean;
  objectAt(clientX: number, clientY: number, options?: MeshObjectQuery): MeshObjectPoint | null;
  pointAt(clientX: number, clientY: number, query?: MeshPointQuery): MeshPoint | null;
  screenOf(point: readonly number[]): { x: number; y: number } | null;
  placeOf(id: string): [number, number, number] | null;
  camera(): MeshCamera | null;
  setCamera(camera: Partial<MeshCamera>, animate: boolean): void;
  destroy(): void;
}

// Asks for what lies on a Canvas under the pointer, among some ids, or where the pointer is on one that is being held.
export interface MeshObjectQuery {
  among?: ReadonlySet<string>;
  holding?: string;
}

// Asks for a point of the world under the pointer. Without `height` it lies on the mesh there; with it, on the level
// plane at that height, wherever the meshes are.
export interface MeshPointQuery {
  height?: number;
}

// A point of the world, in the units of the meshes, and the mesh it lies on, if it lies on one.
export interface MeshPoint {
  x: number;
  y: number;
  z: number;
  mesh?: string;
}

// An object on a Canvas, and where on it the pointer is, as fractions of its width and height.
export interface MeshObjectPoint {
  id: string;
  x: number;
  y: number;
}

export interface StageData {
  id: string;
  orbit: [number, number];
  shadow: boolean;
  environment?: string;
  environmentTurn?: number;
  exposure?: number;
  ground?: MeshGround;
  meshes: Mesh[];
  surfaces?: StageSurface[];
  light?: MeshLight;
  anchors: MeshAnchor[];
}

// What stands on the stage right now: the document, with what handles and data have done to it.
export interface Placement {
  meshes: Mesh[];
  surfaces: StageSurface[];
  light: MeshLight;
}

export function dataOf(host: Element): StageData | undefined {
  try {
    return JSON.parse(host.getAttribute(MESH_STAGE_ATTR) ?? '') as StageData;
  } catch {
    return undefined;
  }
}
