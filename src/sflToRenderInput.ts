import type { RenderInput } from './rendering/renderInput';
import { sflToImportJson } from './sfl';
import { collectRenderEntities } from './sflToRenderInput/entities';
import { resolveExportLinks } from './sflToRenderInput/links';
import type { ImportRenderJson } from './sflToRenderInput/types';

export function sflToRenderInput(sfl: string): RenderInput {
  const json: ImportRenderJson = sflToImportJson(sfl);
  const entities = collectRenderEntities(json);
  return {
    shapes: entities.shapes,
    frames: entities.frames,
    swimlanes: entities.swimlanes,
    tables: entities.tables,
    paths: entities.paths,
    charts: entities.charts,
    links: resolveExportLinks(entities),
    diagnostics: json.diagnostics ?? [],
  };
}
