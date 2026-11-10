import type { Mesh, MeshAnchor, MeshLight, Vec3 } from '../../../model/mesh';
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

export interface MeshStagesHandle {
  // The pictures of the stages in the order of the document, for exports.
  capture(): Array<string | undefined>;
  refresh(): void;
  setValue(meshId: string, property: string, value: number | string): boolean;
  clearValues(): void;
  setEditing(editing: boolean): void;
  setGrid(grid: boolean): void;
  // What the layers of a host have hidden or locked, by name.
  setFlags(flags: MeshStageFlags): void;
  // Selects a mesh, a Canvas or what lies on one, from outside the stage. False when no stage knows the name.
  selectItem(id: string | null): boolean;
  objectAt(clientX: number, clientY: number, options?: MeshObjectQuery): MeshObjectPoint | null;
  destroy(): void;
}

// Asks for what lies on a Canvas under the pointer, among some ids, or where the pointer is on one that is being held.
export interface MeshObjectQuery {
  among?: ReadonlySet<string>;
  holding?: string;
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
