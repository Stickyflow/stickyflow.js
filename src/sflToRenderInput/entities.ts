import type { ImportRenderJson, RenderEntities } from './types';

export function collectRenderEntities(json: ImportRenderJson): RenderEntities {
  const canvas = json.canvas?.entities ?? {};
  const groups = json.layers?.groups ?? [];
  return {
    shapes: [
      ...(canvas.shapes ?? []),
      ...groups.flatMap(group => group.entities?.shapes ?? []),
    ] as RenderEntities['shapes'],
    links: [
      ...(canvas.links ?? []),
      ...groups.flatMap(group => group.entities?.links ?? []),
    ] as RenderEntities['links'],
    frames: (canvas.frames ?? []) as RenderEntities['frames'],
    swimlanes: (canvas.swimlanes ?? []) as RenderEntities['swimlanes'],
    tables: (canvas.tables ?? []) as RenderEntities['tables'],
    paths: (canvas.paths ?? []) as RenderEntities['paths'],
    charts: (canvas.charts ?? []) as RenderEntities['charts'],
  };
}
