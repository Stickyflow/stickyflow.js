import type { Mesh, MeshLight, MeshScene, MeshSurface } from '../../../model/mesh';
import {
  isMeshSurfaceObject,
  type SflCanvasObject,
  type SflMeshLightObject,
  type SflMeshObject,
  type SflMeshSceneObject,
} from '../../../sflSemantic/sflToCanvasState';

export function meshObject(canvasObject: SflMeshObject, scenes: ReadonlySet<string>): Mesh {
  const { asset, role, color, opacity, roughness, metallic, transmission, ior, position, rotation, scale } =
    canvasObject.mesh;
  const parent = canvasObject.parentFrameId;
  return {
    id: canvasObject.id,
    asset,
    role,
    color,
    opacity: opacity ?? 1,
    roughness,
    metallic,
    transmission,
    ior,
    position,
    rotation,
    scale,
    sceneId: parent && scenes.has(parent) ? parent : undefined,
    sourceIndex: canvasObject.sourceIndex,
  };
}

export function meshLightObject(canvasObject: SflMeshLightObject, scenes: ReadonlySet<string>): MeshLight {
  const parent = canvasObject.parentFrameId;
  return { id: canvasObject.id, sceneId: parent && scenes.has(parent) ? parent : undefined, ...canvasObject.meshLight };
}

export function meshSurfaces(canvasObjects: SflCanvasObject[], scenes: ReadonlySet<string>): MeshSurface[] {
  const parents = new Map(canvasObjects.map(object => [object.id, object.parentFrameId]));
  const liesOn = (object: SflCanvasObject, surface: string): boolean => {
    let parent = object.parentFrameId;
    while (parent) {
      if (parent === surface) {
        return true;
      }
      parent = parents.get(parent);
    }
    return false;
  };
  return canvasObjects.filter(isMeshSurfaceObject).map(({ id, width, height, parentFrameId, meshSurface }) => ({
    id,
    sceneId: parentFrameId && scenes.has(parentFrameId) ? parentFrameId : undefined,
    width,
    height,
    ...meshSurface,
    members: canvasObjects
      .filter(object => liesOn(object, id))
      .map(({ id: member, x, y, width: w, height: h }) => ({ id: member, x, y, width: w, height: h })),
  }));
}

export function meshSceneObject(canvasObject: SflMeshSceneObject): MeshScene {
  const { id, x, y, width, height, order, meshScene } = canvasObject;
  const { orbit, shadow, environment, environmentTurn, exposure } = meshScene;
  return { id, x, y, width, height, order, orbit, shadow, environment, environmentTurn, exposure };
}
