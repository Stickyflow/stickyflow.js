import type { Chart } from '../../../model/chart';
import type { Frame } from '../../../model/frame';
import type { Link } from '../../../model/link';
import type { FreeformPath } from '../../../model/path';
import type { Shape } from '../../../model/shape';
import type { Swimlane } from '../../../model/swimlane';
import type { Table } from '../../../model/table';
import type { SflCanvasState } from '../../../sflSemantic/sflToCanvasState';
import { chartObject } from './chart';
import { frameObject } from './frame';
import { linkObject } from './link';
import { pathObject } from './path';
import { shapeObject } from './shape';
import { swimlaneObject } from './swimlane';
import { tableObject } from './table';

export interface CollectedCanvasObjects {
  shapes: Shape[];
  frames: Frame[];
  swimlanes: Swimlane[];
  tables: Table[];
  paths: FreeformPath[];
  charts: Chart[];
  links: Link[];
}

const byOrder = <T extends { order?: number }>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

export function collectCanvasObjects(state: SflCanvasState): CollectedCanvasObjects {
  const canvasObjects = byOrder(state.canvasObjects);
  return {
    shapes: canvasObjects.filter(canvasObject => canvasObject.objectType === 'shape').map(shapeObject),
    frames: canvasObjects.filter(canvasObject => canvasObject.objectType === 'frame').map(frameObject),
    swimlanes: canvasObjects.filter(canvasObject => canvasObject.objectType === 'swimlane').map(swimlaneObject),
    tables: canvasObjects.filter(canvasObject => canvasObject.objectType === 'table').map(tableObject),
    paths: canvasObjects.filter(canvasObject => canvasObject.objectType === 'path').map(pathObject),
    charts: canvasObjects.filter(canvasObject => canvasObject.objectType === 'chart').map(chartObject),
    links: byOrder(state.links).map(linkObject),
  };
}
