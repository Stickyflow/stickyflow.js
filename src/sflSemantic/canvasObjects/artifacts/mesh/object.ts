import type { SflCanvasObject } from '../../types';
import type { SflMeshData, SflMeshSceneData, SflMeshSurfaceData } from './types';

export type SflMeshObject = SflCanvasObject & {
  objectType: 'mesh';
  mesh: SflMeshData;
};

export type SflMeshSceneObject = SflCanvasObject & {
  objectType: 'meshScene';
  meshScene: SflMeshSceneData;
};

export type SflMeshSurfaceObject = SflCanvasObject & {
  objectType: 'meshSurface';
  meshSurface: SflMeshSurfaceData;
};

export function isMeshSurfaceObject(canvasObject: SflCanvasObject): canvasObject is SflMeshSurfaceObject {
  return canvasObject.objectType === 'meshSurface' && canvasObject.meshSurface !== undefined;
}

export function isMeshObject(canvasObject: SflCanvasObject): canvasObject is SflMeshObject {
  return canvasObject.objectType === 'mesh' && canvasObject.mesh !== undefined;
}

export function isMeshSceneObject(canvasObject: SflCanvasObject): canvasObject is SflMeshSceneObject {
  return canvasObject.objectType === 'meshScene' && canvasObject.meshScene !== undefined;
}
