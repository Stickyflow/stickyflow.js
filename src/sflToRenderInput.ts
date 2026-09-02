import { collectEntities } from './renderInput/fromSfl/entities/collect';
import { resolveExportLinks } from './renderInput/fromSfl/links';
import type { RenderInput } from './renderInput/types';
import { sflToCanvasState } from './sfl';

export function sflToRenderInput(sfl: string): RenderInput {
  const state = sflToCanvasState(sfl);
  const entities = collectEntities(state);
  return {
    shapes: entities.shapes,
    frames: entities.frames,
    swimlanes: entities.swimlanes,
    tables: entities.tables,
    paths: entities.paths,
    charts: entities.charts,
    links: resolveExportLinks(entities),
    diagnostics: state.diagnostics,
  };
}
