import type { SflCanvasObject } from '../../types';
import type { SflMeshCanvasData, SflMeshData } from './types';

export type SflMeshObject = SflCanvasObject & {
  objectType: 'mesh';
  mesh: SflMeshData;
};

export type SflMeshCanvasObject = SflCanvasObject & {
  objectType: 'meshCanvas';
  meshCanvas: SflMeshCanvasData;
};

export function isMeshObject(canvasObject: SflCanvasObject): canvasObject is SflMeshObject {
  return canvasObject.objectType === 'mesh' && canvasObject.mesh !== undefined;
}

export function isMeshCanvasObject(canvasObject: SflCanvasObject): canvasObject is SflMeshCanvasObject {
  return canvasObject.objectType === 'meshCanvas' && canvasObject.meshCanvas !== undefined;
}
