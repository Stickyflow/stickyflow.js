import { sflToCanvasState } from '../../sflSemantic/sflToCanvasState';
import type { RenderInput } from '../types';
import { collectEntities } from './entities/collect';
import { resolveExportLinks } from './links';

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
