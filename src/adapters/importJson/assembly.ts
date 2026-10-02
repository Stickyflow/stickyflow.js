import { collectCanvasObjects } from '../../renderInput/fromSfl/canvasObjects/collect';
import { sflToCanvasState } from '../../sflSemantic/sflToCanvasState';
import { createBucketResolver, emptyBuckets, flattenGroups, indexGroupMembership } from './groups';
import type { SflImportJson } from './types';

export function sflToImportJson(sfl: string): SflImportJson {
  const state = sflToCanvasState(sfl);
  const collected = collectCanvasObjects(state);
  const canvas = emptyBuckets();
  const { groupBuckets, bucketFor } = createBucketResolver(indexGroupMembership(state.groups), canvas);

  for (const shape of collected.shapes) {
    bucketFor(shape.id).shapes.push(shape);
  }
  for (const link of collected.links) {
    bucketFor(link.id).links.push(link);
  }

  return {
    project: { export_type: 'stickyflow_canvas_v3', name: 'SFL Import' },
    canvas: {
      entities: {
        notes: [],
        shapes: canvas.shapes,
        links: canvas.links,
        frames: collected.frames,
        swimlanes: collected.swimlanes,
        tables: collected.tables,
        paths: collected.paths,
        charts: collected.charts,
      },
    },
    layers: { groups: flattenGroups(state.groups, groupBuckets) },
    diagnostics: state.diagnostics,
  };
}
