import type { Chart } from '../../../model/chart';
import type { Component } from '../../../model/component';
import type { Connection } from '../../../model/connection';
import type { Dimension } from '../../../model/dimension';
import type { Frame } from '../../../model/frame';
import type { IsometricObject } from '../../../model/isometricObject';
import type { Link } from '../../../model/link';
import type { Mesh, MeshAnchor, MeshLight, MeshScene, MeshSurface } from '../../../model/mesh';
import type { FreeformPath } from '../../../model/path';
import type { Shape } from '../../../model/shape';
import type { Swimlane } from '../../../model/swimlane';
import {
  isDimensionObject,
  isIsometricObject,
  isMeshGroundObject,
  isMeshLightObject,
  isMeshObject,
  isMeshSceneObject,
  type SflCanvasState,
  type SflComponentObject,
} from '../../../sflSemantic/sflToCanvasState';
import { chartObject } from './chart';
import { componentObject } from './component';
import { connectionObject } from './connection';
import { dimensionObject } from './dimension';
import { frameObject } from './frame';
import { isometricObject } from './isometric';
import { linkObject } from './link';
import { meshLightObject, meshObject, meshSceneObject, meshSurfaces } from './mesh';
import { pathObject } from './path';
import { shapeObject } from './shape';
import { swimlaneObject } from './swimlane';

export interface CollectedCanvasObjects {
  shapes: Shape[];
  frames: Frame[];
  swimlanes: Swimlane[];
  isometricObjects: IsometricObject[];
  paths: FreeformPath[];
  dimensions: Dimension[];
  meshes: Mesh[];
  meshScenes: MeshScene[];
  meshSurfaces: MeshSurface[];
  meshLights: MeshLight[];
  meshAnchors: MeshAnchor[];
  charts: Chart[];
  components: Component[];
  links: Link[];
  connections: Connection[];
}

const byOrder = <T extends { order?: number }>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

export function collectCanvasObjects(state: SflCanvasState): CollectedCanvasObjects {
  const canvasObjects = byOrder(state.canvasObjects);
  const shaders = new Map((state.shaders ?? []).map(shader => [shader.name, shader]));
  const sceneIds = new Set(canvasObjects.filter(isMeshSceneObject).map(object => object.id));
  return {
    shapes: canvasObjects
      .filter(canvasObject => canvasObject.objectType === 'shape')
      .map(shape => shapeObject(shape, shaders)),
    frames: canvasObjects.filter(canvasObject => canvasObject.objectType === 'frame').map(frameObject),
    swimlanes: canvasObjects.filter(canvasObject => canvasObject.objectType === 'swimlane').map(swimlaneObject),
    isometricObjects: canvasObjects.filter(isIsometricObject).map(isometricObject),
    paths: canvasObjects.filter(canvasObject => canvasObject.objectType === 'path').map(pathObject),
    dimensions: canvasObjects.filter(isDimensionObject).map(dimensionObject),
    meshes: canvasObjects.filter(isMeshObject).map(object => meshObject(object, sceneIds)),
    meshScenes: canvasObjects.filter(isMeshSceneObject).map(scene => {
      // A Scene has one ground, and the first counts.
      const ground = canvasObjects.filter(isMeshGroundObject).find(object => object.parentFrameId === scene.id);
      return { ...meshSceneObject(scene), ground: ground && { id: ground.id, ...ground.meshGround } };
    }),
    meshSurfaces: meshSurfaces(canvasObjects, sceneIds),
    meshLights: canvasObjects.filter(isMeshLightObject).map(object => meshLightObject(object, sceneIds)),
    meshAnchors: canvasObjects.flatMap(object => (object.anchor ? [{ objectId: object.id, ...object.anchor }] : [])),
    charts: canvasObjects.filter(canvasObject => canvasObject.objectType === 'chart').map(chartObject),
    components: canvasObjects
      .filter(
        (canvasObject): canvasObject is SflComponentObject =>
          canvasObject.objectType === 'component' && canvasObject.component !== undefined,
      )
      .map(componentObject),
    links: byOrder(state.links).map(linkObject),
    connections: byOrder(state.connections).map(connectionObject),
  };
}
