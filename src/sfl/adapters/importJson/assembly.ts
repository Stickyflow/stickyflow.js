import { sflToCanvasState } from '../../sflToCanvasState';
import { chartObject } from './chart';
import { frameObject } from './frame';
import { createBucketResolver, emptyBuckets, flattenGroups, indexGroupMembership } from './groups';
import { linkObject } from './link';
import { pathObject } from './path';
import { shapeObject } from './shape';
import { swimlaneObject } from './swimlane';
import { tableObject } from './table';
import type { ImportChart, ImportFrame, ImportPath, ImportSwimlane, ImportTable, SflImportJson } from './types';

export function sflToImportJson(sfl: string): SflImportJson {
  const state = sflToCanvasState(sfl);
  const canvas = emptyBuckets();
  const { groupBuckets, bucketFor } = createBucketResolver(indexGroupMembership(state.groups), canvas);
  const frames: ImportFrame[] = [];
  const swimlanes: ImportSwimlane[] = [];
  const tables: ImportTable[] = [];
  const paths: ImportPath[] = [];
  const charts: ImportChart[] = [];

  const entities = [...state.entities].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const entity of entities) {
    if (entity.entityType === 'frame') {
      frames.push(frameObject(entity));
    } else if (entity.entityType === 'swimlane') {
      swimlanes.push(swimlaneObject(entity));
    } else if (entity.entityType === 'table') {
      tables.push(tableObject(entity));
    } else if (entity.entityType === 'path') {
      paths.push(pathObject(entity));
    } else if (entity.entityType === 'chart') {
      charts.push(chartObject(entity));
    } else {
      bucketFor(entity.id).shapes.push(shapeObject(entity));
    }
  }

  const links = [...state.links].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  links.forEach(link => {
    bucketFor(link.id).links.push(linkObject(link));
  });

  return {
    project: { export_type: 'stickyflow_canvas_v3', name: 'SFL Import' },
    canvas: {
      entities: {
        notes: [],
        shapes: canvas.shapes,
        links: canvas.links,
        frames,
        swimlanes,
        tables,
        paths,
        charts,
      },
    },
    layers: { groups: flattenGroups(state.groups, groupBuckets) },
    diagnostics: state.diagnostics,
  };
}
