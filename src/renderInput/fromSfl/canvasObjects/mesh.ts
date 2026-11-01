import type { Mesh, MeshCanvas } from '../../../model/mesh';
import type { SflMeshCanvasObject, SflMeshObject } from '../../../sflSemantic/sflToCanvasState';

export function meshObject(canvasObject: SflMeshObject, canvases: ReadonlySet<string>): Mesh {
  const { asset, role, color, opacity, roughness, metallic, position, rotation, scale } = canvasObject.mesh;
  const parent = canvasObject.parentFrameId;
  return {
    id: canvasObject.id,
    asset,
    role,
    color,
    opacity: opacity ?? 1,
    roughness,
    metallic,
    position,
    rotation,
    scale,
    canvasId: parent && canvases.has(parent) ? parent : undefined,
    sourceIndex: canvasObject.sourceIndex,
  };
}

export function meshCanvasObject(canvasObject: SflMeshCanvasObject): MeshCanvas {
  const { id, x, y, width, height, meshCanvas } = canvasObject;
  return { id, x, y, width, height, orbit: meshCanvas.orbit };
}
