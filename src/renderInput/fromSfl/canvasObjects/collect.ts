import type { Chart } from '../../../model/chart';
import type { Connection } from '../../../model/connection';
import type { Frame } from '../../../model/frame';
import type { IsometricObject } from '../../../model/isometricObject';
import type { Link } from '../../../model/link';
import type { FreeformPath } from '../../../model/path';
import type { Shape } from '../../../model/shape';
import type { Swimlane } from '../../../model/swimlane';
import { isIsometricObject, type SflCanvasState } from '../../../sflSemantic/sflToCanvasState';
import { chartObject } from './chart';
import { connectionObject } from './connection';
import { frameObject } from './frame';
import { isometricObject } from './isometric';
import { linkObject } from './link';
import { pathObject } from './path';
import { shapeObject } from './shape';
import { swimlaneObject } from './swimlane';

export interface CollectedCanvasObjects {
  shapes: Shape[];
  frames: Frame[];
  swimlanes: Swimlane[];
  isometricObjects: IsometricObject[];
  paths: FreeformPath[];
  charts: Chart[];
  links: Link[];
  connections: Connection[];
}

const byOrder = <T extends { order?: number }>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

export function collectCanvasObjects(state: SflCanvasState): CollectedCanvasObjects {
  const canvasObjects = byOrder(state.canvasObjects);
  const shaders = new Map((state.shaders ?? []).map(shader => [shader.name, shader]));
  return {
    shapes: canvasObjects
      .filter(canvasObject => canvasObject.objectType === 'shape')
      .map(shape => shapeObject(shape, shaders)),
    frames: canvasObjects.filter(canvasObject => canvasObject.objectType === 'frame').map(frameObject),
    swimlanes: canvasObjects.filter(canvasObject => canvasObject.objectType === 'swimlane').map(swimlaneObject),
    isometricObjects: canvasObjects.filter(isIsometricObject).map(isometricObject),
    paths: canvasObjects.filter(canvasObject => canvasObject.objectType === 'path').map(pathObject),
    charts: canvasObjects.filter(canvasObject => canvasObject.objectType === 'chart').map(chartObject),
    links: byOrder(state.links).map(linkObject),
    connections: byOrder(state.connections).map(connectionObject),
  };
}
