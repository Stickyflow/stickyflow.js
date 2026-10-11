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
    charts: canvasObjects.charts,
    widgets: canvasObjects.widgets,
    links: createRenderInputLinks(canvasObjects),
    diagnostics: state.diagnostics,
  };
}
