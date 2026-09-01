import type { Chart } from '../../../model/charts';
import type { Frame } from '../../../model/frames';
import type { Link } from '../../../model/links';
import type { FreeformPath } from '../../../model/paths';
import type { Shape } from '../../../model/shapes';
import type { Swimlane } from '../../../model/swimlanes';
import type { Table } from '../../../model/tables';
import type { SflCanvasState } from '../../sflToCanvasState';
import { chartObject } from './chart';
import { frameObject } from './frame';
import { linkObject } from './link';
import { pathObject } from './path';
import { shapeObject } from './shape';
import { swimlaneObject } from './swimlane';
import { tableObject } from './table';

export interface CollectedEntities {
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

export function collectEntities(state: SflCanvasState): CollectedEntities {
  const collected: CollectedEntities = {
    shapes: [],
    frames: [],
    swimlanes: [],
    tables: [],
    paths: [],
    charts: [],
    links: [],
  };

  for (const entity of byOrder(state.entities)) {
    if (entity.entityType === 'frame') {
      collected.frames.push(frameObject(entity));
    } else if (entity.entityType === 'swimlane') {
      collected.swimlanes.push(swimlaneObject(entity));
    } else if (entity.entityType === 'table') {
      collected.tables.push(tableObject(entity));
    } else if (entity.entityType === 'path') {
      collected.paths.push(pathObject(entity));
    } else if (entity.entityType === 'chart') {
      collected.charts.push(chartObject(entity));
    } else {
      collected.shapes.push(shapeObject(entity));
    }
  }

  collected.links = byOrder(state.links).map(linkObject);
  return collected;
}
