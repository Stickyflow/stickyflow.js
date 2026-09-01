import type { RenderInput } from './rendering/renderInput';
import { sflToCanvasState } from './sfl';
import { collectEntities } from './sfl/adapters/entities/collect';
import { resolveExportLinks } from './sflToRenderInput/links';

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
