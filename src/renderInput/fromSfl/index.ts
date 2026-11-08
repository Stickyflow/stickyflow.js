import { parse } from '../../sflLanguage';
import type { SflDocument } from '../../sflLanguage/ast';
import { expandDocument } from '../../sflLanguage/expansion';
import { resolveCanvasState } from '../../sflSemantic/canvasState/resolver';
import type { RenderInput } from '../types';
import { collectCanvasObjects } from './canvasObjects/collect';
import { createRenderInputLinks } from './links';

export function sflToRenderInput(sfl: string): RenderInput {
  return documentToRenderInput(parse(sfl));
}

export function documentToRenderInput(doc: SflDocument): RenderInput {
  const state = resolveCanvasState(expandDocument(doc));
  const canvasObjects = collectCanvasObjects(state);
  return {
    shapes: canvasObjects.shapes,
    frames: canvasObjects.frames,
    swimlanes: canvasObjects.swimlanes,
    isometricObjects: canvasObjects.isometricObjects,
    paths: canvasObjects.paths,
    dimensions: canvasObjects.dimensions,
    meshes: canvasObjects.meshes,
    meshScenes: canvasObjects.meshScenes,
    meshSurfaces: canvasObjects.meshSurfaces,
    meshLights: canvasObjects.meshLights,
    meshAnchors: canvasObjects.meshAnchors,
    charts: canvasObjects.charts,
    components: canvasObjects.components,
    links: createRenderInputLinks(canvasObjects),
    diagnostics: state.diagnostics,
  };
}
