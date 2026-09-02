import type { Chart } from '../../../model/charts';
import type { Frame } from '../../../model/frames';
import type { Link } from '../../../model/links';
import type { FreeformPath } from '../../../model/paths';
import type { Shape } from '../../../model/shapes';
import type { Swimlane } from '../../../model/swimlanes';
import type { Table } from '../../../model/tables';
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
