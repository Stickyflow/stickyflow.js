import type { Chart } from '../../../model/chart';
import type { Connection } from '../../../model/connection';
import type { Frame } from '../../../model/frame';
import type { IsometricObject } from '../../../model/isometricObject';
import type { Link } from '../../../model/link';
import type { FreeformPath } from '../../../model/path';
import type { Shape } from '../../../model/shape';
import type { Swimlane } from '../../../model/swimlane';
import type { Widget } from '../../../model/widget';
import { isIsometricObject, type SflCanvasState, type SflWidgetObject } from '../../../sflSemantic/sflToCanvasState';
import { chartObject } from './chart';
import { connectionObject } from './connection';
import { frameObject } from './frame';
import { isometricObject } from './isometric';
import { linkObject } from './link';
import { pathObject } from './path';
import { shapeObject } from './shape';
import { swimlaneObject } from './swimlane';
import { widgetObject } from './widget';

export interface CollectedCanvasObjects {
  shapes: Shape[];
  frames: Frame[];
  swimlanes: Swimlane[];
  isometricObjects: IsometricObject[];
  paths: FreeformPath[];
  charts: Chart[];
  widgets: Widget[];
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
    widgets: canvasObjects
      .filter(
        (canvasObject): canvasObject is SflWidgetObject =>
          canvasObject.objectType === 'widget' && (canvasObject.widget?.type === 'rollingNumber' || canvasObject.widget?.type === 'tickScale'),
      )
      .map(widgetObject),
    links: byOrder(state.links).map(linkObject),
    connections: byOrder(state.connections).map(connectionObject),
  };
}
