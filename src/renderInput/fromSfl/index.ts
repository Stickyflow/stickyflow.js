import { sflToCanvasState } from '../../sflSemantic/sflToCanvasState';
import type { RenderInput } from '../types';
import { collectCanvasObjects } from './canvasObjects/collect';
import { createRenderInputLinks } from './links';

export function sflToRenderInput(sfl: string): RenderInput {
  const state = sflToCanvasState(sfl);
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
    meshAnchors: canvasObjects.meshAnchors,
    charts: canvasObjects.charts,
    components: canvasObjects.components,
    links: createRenderInputLinks(canvasObjects),
    diagnostics: state.diagnostics,
  };
}
