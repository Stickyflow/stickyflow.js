import type { Chart } from '../../../model/chart';
import type { Frame } from '../../../model/frame';
import type { Link } from '../../../model/link';
import type { FreeformPath } from '../../../model/path';
import type { Shape } from '../../../model/shape';
import type { Swimlane } from '../../../model/swimlane';
import type { Table } from '../../../model/table';
import type { SflCanvasState } from '../../../sfl/sflToCanvasState';
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
  const entities = byOrder(state.entities);
  return {
    shapes: entities.filter(entity => entity.entityType === 'shape').map(shapeObject),
    frames: entities.filter(entity => entity.entityType === 'frame').map(frameObject),
    swimlanes: entities.filter(entity => entity.entityType === 'swimlane').map(swimlaneObject),
    tables: entities.filter(entity => entity.entityType === 'table').map(tableObject),
    paths: entities.filter(entity => entity.entityType === 'path').map(pathObject),
    charts: entities.filter(entity => entity.entityType === 'chart').map(chartObject),
    links: byOrder(state.links).map(linkObject),
  };
}
