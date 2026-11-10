import type { SflCanvasObject } from '../../types';
import type { SflMeshData, SflMeshGroundData, SflMeshLightData, SflMeshSceneData, SflMeshSurfaceData } from './types';

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

export type SflMeshLightObject = SflCanvasObject & {
  objectType: 'meshLight';
  meshLight: SflMeshLightData;
};

export function isMeshLightObject(canvasObject: SflCanvasObject): canvasObject is SflMeshLightObject {
  return canvasObject.objectType === 'meshLight' && canvasObject.meshLight !== undefined;
}

export type SflMeshGroundObject = SflCanvasObject & {
  objectType: 'meshGround';
  meshGround: SflMeshGroundData;
};

export function isMeshGroundObject(canvasObject: SflCanvasObject): canvasObject is SflMeshGroundObject {
  return canvasObject.objectType === 'meshGround' && canvasObject.meshGround !== undefined;
}

export function isMeshObject(canvasObject: SflCanvasObject): canvasObject is SflMeshObject {
  return canvasObject.objectType === 'mesh' && canvasObject.mesh !== undefined;
}

export function isMeshSceneObject(canvasObject: SflCanvasObject): canvasObject is SflMeshSceneObject {
  return canvasObject.objectType === 'meshScene' && canvasObject.meshScene !== undefined;
}
